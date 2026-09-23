/*
 * Physics approach adapted from Aayan Ali's aayans-yc-indexor (MIT).
 * The full license notice is included beside this component.
 */
"use client";

import Matter from "matter-js";
import { memo, useEffect, useRef } from "react";

const STEP = 1000 / 60;
const SUBSTEPS = 3;
const SUBSTEP = STEP / SUBSTEPS;
const CATCH_UP_STEPS = 4;
const WALL = 400;
const HEADROOM = 140;
const SPRING = 0.00002;
const DAMPING = 0.00046;
const TURN = 0.0000043;
const TURN_DAMPING = 0.00026;

type FloorItem = {
  id: string;
  name: string;
  src: string | null;
};

type Anchor = { x: number; y: number };

export type SurpriseFloorApi = {
  select: (index: number, getAnchor: () => Anchor) => void;
  release: () => void;
};

type Props = {
  items: FloorItem[];
  apiRef: React.RefObject<SurpriseFloorApi | null>;
  onPick: (index: number) => void;
  onReady?: () => void;
};

type HeldIcon = {
  index: number;
  getAnchor: () => Anchor;
  scale: number;
  time: number;
  boost: number;
  arrived: boolean;
};

type Sprite = HTMLCanvasElement | null;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export const SurpriseIconFloor = memo(function SurpriseIconFloor({
  items,
  apiRef,
  onPick,
  onReady,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasNode = canvasRef.current;
    if (!canvasNode || !items.length) return;
    const drawingContext = canvasNode.getContext("2d", { alpha: true });
    if (!drawingContext) return;
    const canvas: HTMLCanvasElement = canvasNode;
    const context: CanvasRenderingContext2D = drawingContext;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const engine = Matter.Engine.create({ gravity: { x: 0, y: 1, scale: 0.001 } });
    engine.enableSleeping = true;
    engine.positionIterations = 4;
    engine.velocityIterations = 3;

    const sleeping = Matter.Sleeping as unknown as {
      _motionSleepThreshold: number;
      _motionWakeThreshold: number;
    };
    sleeping._motionSleepThreshold = 0.35;
    sleeping._motionWakeThreshold = 0.8;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let size = 52;
    const active = new Set<number>();
    let walls: Matter.Body[] = [];
    let ceilingClosed = false;
    let held: HeldIcon | null = null;
    let pointerDrag: {
      pointerId: number;
      index: number;
      start: Anchor;
      moved: boolean;
      constraint: Matter.Constraint;
    } | null = null;
    let dirty = true;
    let stopped = false;
    const images: Array<HTMLImageElement | null> = items.map(() => null);
    const sprites: Sprite[] = items.map(() => null);
    const bodies: Matter.Body[] = [];

    function buildSprite(index: number) {
      const pixels = Math.max(1, Math.round(Math.max(size, 96) * dpr));
      const sprite = document.createElement("canvas");
      sprite.width = pixels;
      sprite.height = pixels;
      const spriteContext = sprite.getContext("2d");
      if (!spriteContext) return;

      const radius = pixels * 0.225;
      spriteContext.beginPath();
      spriteContext.roundRect(0, 0, pixels, pixels, radius);
      spriteContext.clip();
      spriteContext.fillStyle = "#ffffff";
      spriteContext.fillRect(0, 0, pixels, pixels);

      const image = images[index];
      if (image?.complete && image.naturalWidth > 0) {
        const sourceSide = Math.min(image.naturalWidth, image.naturalHeight);
        const sourceX = (image.naturalWidth - sourceSide) / 2;
        const sourceY = (image.naturalHeight - sourceSide) / 2;
        spriteContext.imageSmoothingEnabled = true;
        spriteContext.imageSmoothingQuality = "high";
        spriteContext.drawImage(
          image,
          sourceX,
          sourceY,
          sourceSide,
          sourceSide,
          0,
          0,
          pixels,
          pixels,
        );
      } else {
        spriteContext.fillStyle = "#55224f";
        spriteContext.fillRect(0, 0, pixels, pixels);
        spriteContext.fillStyle = "#ffffff";
        spriteContext.font = `800 ${Math.round(pixels * 0.29)}px -apple-system, BlinkMacSystemFont, sans-serif`;
        spriteContext.textAlign = "center";
        spriteContext.textBaseline = "middle";
        spriteContext.fillText(initials(items[index].name), pixels / 2, pixels / 2 + pixels * 0.015);
      }

      spriteContext.strokeStyle = "rgba(20, 25, 32, 0.12)";
      spriteContext.lineWidth = Math.max(1, pixels * 0.012);
      spriteContext.beginPath();
      spriteContext.roundRect(
        spriteContext.lineWidth / 2,
        spriteContext.lineWidth / 2,
        pixels - spriteContext.lineWidth,
        pixels - spriteContext.lineWidth,
        radius,
      );
      spriteContext.stroke();
      sprites[index] = sprite;
      dirty = true;
    }

    items.forEach((item, index) => {
      if (!item.src) {
        buildSprite(index);
        return;
      }
      const image = new Image();
      image.decoding = "async";
      image.src = item.src;
      images[index] = image;
      image.onload = () => buildSprite(index);
      image.onerror = () => {
        images[index] = null;
        buildSprite(index);
      };
      if (image.complete && image.naturalWidth) buildSprite(index);
    });

    function buildWalls() {
      Matter.Composite.remove(engine.world, walls);
      walls = [
        Matter.Bodies.rectangle(width / 2, height + WALL / 2, width + WALL * 2, WALL, {
          isStatic: true,
          friction: 0.9,
        }),
        Matter.Bodies.rectangle(-WALL / 2, height / 2, WALL, height * 4 + WALL * 2, { isStatic: true }),
        Matter.Bodies.rectangle(width + WALL / 2, height / 2, WALL, height * 4 + WALL * 2, { isStatic: true }),
      ];
      if (ceilingClosed) {
        walls.push(Matter.Bodies.rectangle(
          width / 2,
          -HEADROOM - WALL / 2,
          width + WALL * 2,
          WALL,
          { isStatic: true },
        ));
      }
      Matter.Composite.add(engine.world, walls);
    }

    function fitSize() {
      const areaFit = Math.sqrt((width * height * 0.42) / Math.max(1, items.length));
      return Math.max(30, Math.min(62, areaFit));
    }

    function resize() {
      const previousSize = size;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      size = fitSize();
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildWalls();

      if (bodies.length && previousSize !== size) {
        const ratio = size / previousSize;
        for (const body of bodies) Matter.Body.scale(body, ratio, ratio);
      }
      for (let index = 0; index < items.length; index += 1) buildSprite(index);
      dirty = true;
    }

    resize();

    function spawn(index: number) {
      return Matter.Bodies.rectangle(
        width * (0.1 + 0.8 * ((index * 0.61803398875) % 1)),
        -size * (1.4 + (index % 12) * 1.3),
        size,
        size,
        {
          restitution: 0.45,
          friction: 0.6,
          frictionStatic: 1.2,
          frictionAir: 0.014,
          angle: (Math.random() - 0.5) * 0.6,
          sleepThreshold: 30,
        },
      );
    }

    items.forEach((_, index) => bodies.push(spawn(index)));

    function activate(index: number) {
      if (active.has(index) || !bodies[index]) return;
      Matter.Composite.add(engine.world, bodies[index]);
      active.add(index);
      dirty = true;
    }

    function release() {
      if (!held) return;
      const body = bodies[held.index];
      Matter.Body.scale(body, 1 / held.scale, 1 / held.scale);
      body.collisionFilter.group = 0;
      body.collisionFilter.mask = 0xffffffff;
      if (reducedMotion) {
        Matter.Body.setPosition(body, {
          x: size + Math.random() * Math.max(1, width - size * 2),
          y: height - size * (0.7 + Math.random() * 2.5),
        });
        Matter.Body.setAngle(body, (Math.random() - 0.5) * 0.5);
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(body, 0);
        Matter.Sleeping.set(body, true);
      } else {
        Matter.Sleeping.set(body, false);
      }
      held = null;
      dirty = true;
    }

    function select(index: number, getAnchor: () => Anchor) {
      if (!bodies[index]) return;
      if (held?.index === index) {
        held.getAnchor = getAnchor;
        return;
      }
      release();
      activate(index);
      const targetSide = Math.max(76, Math.min(96, width / 10));
      const scale = targetSide / size;
      const body = bodies[index];
      Matter.Body.scale(body, scale, scale);
      body.collisionFilter.group = -1;
      held = { index, getAnchor, scale, time: 0, boost: 1, arrived: false };
      Matter.Sleeping.set(body, false);
      if (reducedMotion) {
        const anchor = getAnchor();
        Matter.Body.setPosition(body, anchor);
        Matter.Body.setAngle(body, 0);
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(body, 0);
        Matter.Sleeping.set(body, true);
      }
      dirty = true;
    }

    function wakeNear(body: Matter.Body) {
      const reach = (size * 3.2) ** 2;
      const column = size * 2.2;
      for (const index of active) {
        const other = bodies[index];
        if (!other.isSleeping || other === body) continue;
        const differenceX = other.position.x - body.position.x;
        const differenceY = other.position.y - body.position.y;
        if (
          differenceX * differenceX + differenceY * differenceY < reach
          || (Math.abs(differenceX) < column && differenceY < size)
        ) Matter.Sleeping.set(other, false);
      }
    }

    function applyHold(delta: number) {
      if (!held || pointerDrag?.index === held.index) return;
      const body = bodies[held.index];
      const anchor = held.getAnchor();
      Matter.Sleeping.set(body, false);
      const velocity = Matter.Body.getVelocity(body);
      held.time += delta / 1000;
      const distance = Math.hypot(anchor.x - body.position.x, anchor.y - body.position.y);
      held.boost = distance > 40 && Matter.Body.getSpeed(body) < 3
        ? Math.min(6, held.boost + 0.12 * (delta / STEP))
        : Math.max(1, held.boost - 0.15 * (delta / STEP));
      if (held.boost > 1.2) wakeNear(body);
      if (!held.arrived && (distance < Math.max(26, size * held.scale * 0.8) || held.time > 3)) {
        held.arrived = true;
        body.collisionFilter.mask = 0;
        wakeNear(body);
      }
      const firm = held.arrived ? 5 : 1;
      const pullX = (anchor.x - body.position.x) * SPRING * held.boost * firm
        - velocity.x * DAMPING * Math.sqrt(firm);
      const pullY = (anchor.y - body.position.y) * SPRING * held.boost * firm
        - velocity.y * DAMPING * Math.sqrt(firm);
      Matter.Body.applyForce(body, body.position, {
        x: (pullX - engine.gravity.x * engine.gravity.scale) * body.mass,
        y: (pullY - engine.gravity.y * engine.gravity.scale) * body.mass,
      });
      const lean = Math.atan2(Math.sin(body.angle), Math.cos(body.angle));
      const brisk = held.arrived ? 7 : 1;
      body.torque += (
        -lean * TURN * brisk
        - Matter.Body.getAngularVelocity(body) * TURN_DAMPING * Math.sqrt(brisk)
      ) * body.inertia;
    }

    function limitSpeeds(delta: number) {
      const perStep = STEP / delta;
      for (const index of active) {
        const body = bodies[index];
        if (body.isSleeping) continue;
        const selectedScale = held?.index === index ? held.scale : 1;
        const maximum = size * selectedScale * 0.45 * perStep;
        const speed = Matter.Body.getSpeed(body);
        if (speed <= maximum) continue;
        const velocity = Matter.Body.getVelocity(body);
        Matter.Body.setVelocity(body, {
          x: (velocity.x * maximum) / speed,
          y: (velocity.y * maximum) / speed,
        });
      }
    }

    function drawBody(index: number) {
      const sprite = sprites[index];
      if (!sprite) return;
      const body = bodies[index];
      const drawnSize = size * (held?.index === index ? held.scale : 1);
      const cosine = Math.cos(body.angle);
      const sine = Math.sin(body.angle);
      context.setTransform(
        dpr * cosine,
        dpr * sine,
        -dpr * sine,
        dpr * cosine,
        dpr * body.position.x,
        dpr * body.position.y,
      );
      context.drawImage(sprite, -drawnSize / 2, -drawnSize / 2, drawnSize, drawnSize);
    }

    function draw() {
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      for (const index of active) {
        if (held?.index !== index) drawBody(index);
      }
      if (held && active.has(held.index)) drawBody(held.index);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    if (reducedMotion) {
      for (let index = 0; index < bodies.length; index += 1) activate(index);
      for (let index = 0; index < 500; index += 1) Matter.Engine.update(engine, STEP);
      for (const body of bodies) Matter.Sleeping.set(body, true);
      draw();
    }

    let animationFrame = 0;
    let lastFrame = performance.now();
    let accumulator = 0;
    let dropAt = performance.now() + 160;
    let dropIndex = 0;
    let patrolAt = 0;

    function frame(now: number) {
      if (stopped) return;
      animationFrame = requestAnimationFrame(frame);
      const elapsed = Math.min(now - lastFrame, 120);
      lastFrame = now;

      if (!reducedMotion) {
        const gap = Math.min(50, 3600 / Math.max(1, bodies.length));
        let poured = 0;
        while (dropIndex < bodies.length && now >= dropAt && poured < 12) {
          activate(dropIndex);
          dropIndex += 1;
          dropAt = Math.max(dropAt + gap, now - 100);
          poured += 1;
          dirty = true;
        }

        accumulator += elapsed;
        let ran = 0;
        while (accumulator >= SUBSTEP && ran < CATCH_UP_STEPS) {
          applyHold(SUBSTEP);
          limitSpeeds(SUBSTEP);
          Matter.Engine.update(engine, SUBSTEP);
          accumulator -= SUBSTEP;
          ran += 1;
        }
        if (accumulator > SUBSTEP * CATCH_UP_STEPS) accumulator = 0;

        let awake = false;
        for (const index of active) {
          if (!bodies[index].isSleeping) {
            awake = true;
            break;
          }
        }
        if (awake) dirty = true;
      }

      if (now - patrolAt > 1000) {
        patrolAt = now;
        if (!ceilingClosed && active.size === bodies.length && [...active].every((index) => bodies[index].position.y > size)) {
          ceilingClosed = true;
          buildWalls();
        }
        for (const index of active) {
          if (held?.index === index) continue;
          const body = bodies[index];
          const outside = body.position.x < -size
            || body.position.x > width + size
            || body.position.y > height + size
            || (ceilingClosed && body.position.y < -HEADROOM - size)
            || Number.isNaN(body.position.x + body.position.y);
          if (!outside) continue;
          Matter.Body.setPosition(body, { x: width * (0.3 + Math.random() * 0.4), y: size * 2 });
          Matter.Body.setVelocity(body, { x: 0, y: 0 });
          Matter.Sleeping.set(body, false);
          dirty = true;
        }
      }

      if (dirty) {
        draw();
        dirty = false;
      }
    }

    animationFrame = requestAnimationFrame(frame);
    apiRef.current = { select, release };
    onReady?.();

    function pointFromEvent(event: PointerEvent): Anchor {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function pointerDown(event: PointerEvent) {
      if (pointerDrag || !event.isPrimary || event.button !== 0) return;
      const point = pointFromEvent(event);
      const found = Matter.Query.point([...active].map((index) => bodies[index]), point);
      const body = found.find((candidate) => held?.index === bodies.indexOf(candidate)) ?? found.at(-1);
      if (!body) return;
      const index = bodies.indexOf(body);
      if (index < 0) return;

      Matter.Sleeping.set(body, false);
      if (held?.index === index) body.collisionFilter.mask = 0xffffffff;
      const constraint = Matter.Constraint.create({
        pointA: point,
        bodyB: body,
        pointB: { x: point.x - body.position.x, y: point.y - body.position.y },
        length: 0,
        stiffness: 0.14,
        damping: 0.12,
        render: { visible: false },
      });
      Matter.Composite.add(engine.world, constraint);
      pointerDrag = { pointerId: event.pointerId, index, start: point, moved: false, constraint };
      canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
      dirty = true;
    }

    function pointerMove(event: PointerEvent) {
      if (!pointerDrag || event.pointerId !== pointerDrag.pointerId) return;
      const point = pointFromEvent(event);
      pointerDrag.constraint.pointA = point;
      if (Math.hypot(point.x - pointerDrag.start.x, point.y - pointerDrag.start.y) > 7) {
        pointerDrag.moved = true;
      }
      const body = bodies[pointerDrag.index];
      if (reducedMotion) {
        Matter.Body.setPosition(body, point);
      } else {
        Matter.Sleeping.set(body, false);
      }
      dirty = true;
    }

    function finishDrag(event?: PointerEvent, pick = false) {
      if (!pointerDrag || (event && event.pointerId !== pointerDrag.pointerId)) return;
      const { pointerId, index, moved, constraint } = pointerDrag;
      pointerDrag = null;
      Matter.Composite.remove(engine.world, constraint);
      if (held?.index === index && held.arrived) bodies[index].collisionFilter.mask = 0;
      if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
      if (pick && !moved) onPick(index);
      dirty = true;
    }

    function pointerUp(event: PointerEvent) {
      finishDrag(event, true);
    }

    function pointerCancel(event: PointerEvent) {
      finishDrag(event);
    }

    function keyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (!bodies.length) return;
      const choices = active.size ? [...active] : [0];
      const current = held?.index ?? -1;
      const next = choices.find((index) => index > current) ?? choices[0];
      if (next !== undefined) onPick(next);
    }

    function windowBlur() {
      finishDrag();
    }

    function onResize() {
      resize();
      for (const index of active) {
        const body = bodies[index];
        if (held?.index === index) continue;
        if (body.position.x < 0 || body.position.x > width || body.position.y > height + size) {
          Matter.Body.setPosition(body, { x: width / 2, y: -size });
          Matter.Body.setVelocity(body, { x: 0, y: 0 });
          Matter.Sleeping.set(body, false);
        }
      }
    }

    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerCancel);
    canvas.addEventListener("lostpointercapture", pointerCancel);
    canvas.addEventListener("keydown", keyDown);
    window.addEventListener("blur", windowBlur);
    window.addEventListener("resize", onResize);

    return () => {
      stopped = true;
      cancelAnimationFrame(animationFrame);
      finishDrag();
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerCancel);
      canvas.removeEventListener("lostpointercapture", pointerCancel);
      canvas.removeEventListener("keydown", keyDown);
      window.removeEventListener("blur", windowBlur);
      window.removeEventListener("resize", onResize);
      apiRef.current = null;
      Matter.Composite.clear(engine.world, false);
      Matter.Engine.clear(engine);
    };
  }, [apiRef, items, onPick, onReady]);

  return (
    <canvas
      aria-label="Mac app icon pile. Press Enter or Space to choose an icon."
      className="surprise-floor"
      ref={canvasRef}
      role="button"
      tabIndex={items.length ? 0 : -1}
    />
  );
});
