/*
 * Physics approach adapted from Aayan Ali's aayans-yc-indexor (MIT).
 * The full license notice is included beside this component.
 */
"use client";

import Matter from "matter-js";
import { memo, useEffect, useRef } from "react";

const FRAME_DURATION_MS = 1000 / 60;
const PHYSICS_SUBSTEPS_PER_FRAME = 3;
const PHYSICS_TIMESTEP_MS = FRAME_DURATION_MS / PHYSICS_SUBSTEPS_PER_FRAME;
const MAX_PHYSICS_STEPS_PER_FRAME = 4;
const BOUNDARY_THICKNESS = 400;
const CEILING_HEADROOM = 140;
const SELECTION_SPRING_STRENGTH = 0.00002;
const SELECTION_VELOCITY_DAMPING = 0.00046;
const SELECTION_ROTATION_STRENGTH = 0.0000043;
const SELECTION_ROTATION_DAMPING = 0.00026;
const MAX_CONCURRENT_ICON_REQUESTS = 6;

type FloorIcon = {
  id: string;
  name: string;
  src: string | null;
};

type CanvasPoint = { x: number; y: number };

export type SurpriseFloorApi = {
  select: (index: number, getSelectionAnchor: () => CanvasPoint) => void;
  release: () => void;
};

type SurpriseIconFloorProps = {
  items: FloorIcon[];
  apiRef: React.RefObject<SurpriseFloorApi | null>;
  onPick: (index: number) => void;
  onReady?: () => void;
  onSettled?: () => void;
  onArrived?: (index: number) => void;
  onDeparted?: (index: number) => void;
};

type SelectedIconState = {
  index: number;
  getSelectionAnchor: () => CanvasPoint;
  scale: number;
  time: number;
  boost: number;
  arrived: boolean;
  announced: boolean;
  stableFor: number;
};

type IconSprite = HTMLCanvasElement | null;

function createIconInitials(name: string) {
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
  onSettled,
  onArrived,
  onDeparted,
}: SurpriseIconFloorProps) {
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

    let width = 0;
    let height = 0;
    let dpr = 1;
    let size = 52;
    const activeBodyIndexes = new Set<number>();
    let boundaryBodies: Matter.Body[] = [];
    let isCeilingClosed = false;
    let selectedIcon: SelectedIconState | null = null;
    let activePointerDrag: {
      pointerId: number;
      index: number;
      start: CanvasPoint;
      lastPoint: CanvasPoint;
      travel: number;
      startedAt: number;
      constraint: Matter.Constraint;
    } | null = null;
    let needsRedraw = true;
    let isDisposed = false;
    let animationFrameId = 0;
    let previousFrameTimestamp = performance.now();
    let accumulatedPhysicsTime = 0;
    let nextIconDropTimestamp = performance.now() + 160;
    let nextIconDropIndex = 0;
    let lastBoundaryCheckTimestamp = 0;
    let lastSettleCheckTimestamp = 0;
    let quietStartTimestamp: number | null = null;
    let hasNotifiedSettled = false;
    const iconImages: Array<HTMLImageElement | null> = items.map(() => null);
    const iconSprites: IconSprite[] = items.map(() => null);
    const iconBodies: Matter.Body[] = [];

    function scheduleAnimationFrame() {
      if (isDisposed || animationFrameId !== 0) return;
      animationFrameId = requestAnimationFrame(runAnimationFrame);
    }

    function renderIconSprite(index: number) {
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

      const image = iconImages[index];
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
        spriteContext.fillText(createIconInitials(items[index].name), pixels / 2, pixels / 2 + pixels * 0.015);
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
      iconSprites[index] = sprite;
      needsRedraw = true;
      scheduleAnimationFrame();
    }

    function rebuildBoundaryBodies() {
      Matter.Composite.remove(engine.world, boundaryBodies);
      boundaryBodies = [
        Matter.Bodies.rectangle(width / 2, height + BOUNDARY_THICKNESS / 2, width + BOUNDARY_THICKNESS * 2, BOUNDARY_THICKNESS, {
          isStatic: true,
          friction: 0.9,
        }),
        Matter.Bodies.rectangle(-BOUNDARY_THICKNESS / 2, height / 2, BOUNDARY_THICKNESS, height * 4 + BOUNDARY_THICKNESS * 2, { isStatic: true }),
        Matter.Bodies.rectangle(width + BOUNDARY_THICKNESS / 2, height / 2, BOUNDARY_THICKNESS, height * 4 + BOUNDARY_THICKNESS * 2, { isStatic: true }),
      ];
      if (isCeilingClosed) {
        boundaryBodies.push(Matter.Bodies.rectangle(
          width / 2,
          -CEILING_HEADROOM - BOUNDARY_THICKNESS / 2,
          width + BOUNDARY_THICKNESS * 2,
          BOUNDARY_THICKNESS,
          { isStatic: true },
        ));
      }
      Matter.Composite.add(engine.world, boundaryBodies);
    }

    function calculateIconSize() {
      const areaFit = Math.sqrt((width * height * 0.42) / Math.max(1, items.length));
      return Math.max(30, Math.min(62, areaFit));
    }

    function resizeCanvas() {
      const previousSize = size;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      size = calculateIconSize();
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuildBoundaryBodies();

      if (iconBodies.length && previousSize !== size) {
        const ratio = size / previousSize;
        for (const body of iconBodies) Matter.Body.scale(body, ratio, ratio);
      }
      if (selectedIcon) {
        const nextScale = calculateSelectedIconScale();
        Matter.Body.scale(iconBodies[selectedIcon.index], nextScale / selectedIcon.scale, nextScale / selectedIcon.scale);
        selectedIcon.scale = nextScale;
      }
      for (let index = 0; index < items.length; index += 1) renderIconSprite(index);
      needsRedraw = true;
      scheduleAnimationFrame();
    }

    resizeCanvas();

    const imageQueue = items.flatMap((item, index) => item.src ? [index] : []);
    let nextImageQueueIndex = 0;

    function loadNextQueuedIcon() {
      if (isDisposed) return;
      const index = imageQueue[nextImageQueueIndex];
      if (index === undefined) return;
      nextImageQueueIndex += 1;

      const image = new Image();
      image.decoding = "async";
      image.fetchPriority = "low";
      iconImages[index] = image;
      image.onload = () => {
        image.onload = null;
        image.onerror = null;
        if (isDisposed) return;
        renderIconSprite(index);
        loadNextQueuedIcon();
      };
      image.onerror = () => {
        image.onload = null;
        image.onerror = null;
        iconImages[index] = null;
        if (isDisposed) return;
        renderIconSprite(index);
        loadNextQueuedIcon();
      };
      image.src = items[index].src ?? "";
    }

    for (let index = 0; index < Math.min(MAX_CONCURRENT_ICON_REQUESTS, imageQueue.length); index += 1) {
      loadNextQueuedIcon();
    }

    function createIconBody(index: number) {
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

    items.forEach((_, index) => iconBodies.push(createIconBody(index)));

    function calculateSelectedIconScale() {
      const targetSide = Math.max(76, Math.min(96, width / 10));
      return targetSide / size;
    }

    function activateIconBody(index: number) {
      if (activeBodyIndexes.has(index) || !iconBodies[index]) return;
      Matter.Composite.add(engine.world, iconBodies[index]);
      activeBodyIndexes.add(index);
      needsRedraw = true;
      scheduleAnimationFrame();
    }

    function releaseSelectedIcon() {
      if (!selectedIcon) return;
      const body = iconBodies[selectedIcon.index];
      Matter.Body.scale(body, 1 / selectedIcon.scale, 1 / selectedIcon.scale);
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
      selectedIcon = null;
      needsRedraw = true;
      scheduleAnimationFrame();
    }

    function selectIcon(index: number, getSelectionAnchor: () => CanvasPoint) {
      if (!iconBodies[index]) return;
      if (selectedIcon?.index === index) {
        selectedIcon.getSelectionAnchor = getSelectionAnchor;
        return;
      }
      releaseSelectedIcon();
      activateIconBody(index);
      const scale = calculateSelectedIconScale();
      const body = iconBodies[index];
      Matter.Body.scale(body, scale, scale);
      body.collisionFilter.group = -1;
      selectedIcon = { index, getSelectionAnchor, scale, time: 0, boost: 1, arrived: false, announced: false, stableFor: 0 };
      Matter.Sleeping.set(body, false);
      if (reducedMotion) {
        const anchor = getSelectionAnchor();
        Matter.Body.setPosition(body, anchor);
        Matter.Body.setAngle(body, 0);
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(body, 0);
        body.collisionFilter.mask = 0;
        Matter.Sleeping.set(body, true);
        selectedIcon.arrived = true;
        selectedIcon.announced = true;
        onArrived?.(index);
      }
      needsRedraw = true;
      scheduleAnimationFrame();
    }

    function wakeNearbyBodies(body: Matter.Body) {
      const reach = (size * 3.2) ** 2;
      const column = size * 2.2;
      for (const index of activeBodyIndexes) {
        const other = iconBodies[index];
        if (!other.isSleeping || other === body) continue;
        const differenceX = other.position.x - body.position.x;
        const differenceY = other.position.y - body.position.y;
        if (
          differenceX * differenceX + differenceY * differenceY < reach
          || (Math.abs(differenceX) < column && differenceY < size)
        ) Matter.Sleeping.set(other, false);
      }
    }

    function applySelectionForces(delta: number) {
      if (!selectedIcon || activePointerDrag?.index === selectedIcon.index) return;
      const body = iconBodies[selectedIcon.index];
      const anchor = selectedIcon.getSelectionAnchor();
      const velocity = Matter.Body.getVelocity(body);
      const distance = Math.hypot(anchor.x - body.position.x, anchor.y - body.position.y);
      const lean = Math.atan2(Math.sin(body.angle), Math.cos(body.angle));
      if (selectedIcon.arrived && selectedIcon.announced
        && distance < 1.5
        && Matter.Body.getSpeed(body) < 0.3
        && Math.abs(lean) < 0.01
        && Math.abs(Matter.Body.getAngularVelocity(body)) < 0.01) {
        Matter.Body.setPosition(body, anchor);
        Matter.Body.setAngle(body, 0);
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(body, 0);
        Matter.Sleeping.set(body, true);
        return;
      }

      Matter.Sleeping.set(body, false);
      selectedIcon.time += delta / 1000;
      selectedIcon.boost = distance > 40 && Matter.Body.getSpeed(body) < 3
        ? Math.min(6, selectedIcon.boost + 0.12 * (delta / FRAME_DURATION_MS))
        : Math.max(1, selectedIcon.boost - 0.15 * (delta / FRAME_DURATION_MS));
      if (selectedIcon.boost > 1.2) wakeNearbyBodies(body);
      if (!selectedIcon.arrived && (distance < Math.max(26, size * selectedIcon.scale * 0.8) || selectedIcon.time > 3)) {
        selectedIcon.arrived = true;
        body.collisionFilter.mask = 0;
        wakeNearbyBodies(body);
      }
      if (!selectedIcon.announced) {
        const stable = iconSprites[selectedIcon.index] !== null
          && distance < Math.max(24, size * selectedIcon.scale * 0.35)
          && Matter.Body.getSpeed(body) < 0.8
          && Math.abs(Matter.Body.getAngularVelocity(body)) < 0.02;
        selectedIcon.stableFor = stable ? selectedIcon.stableFor + delta : 0;
        if (selectedIcon.stableFor >= 220) {
          selectedIcon.announced = true;
          onArrived?.(selectedIcon.index);
        }
      }
      const firm = selectedIcon.arrived ? 5 : 1;
      const pullX = (anchor.x - body.position.x) * SELECTION_SPRING_STRENGTH * selectedIcon.boost * firm
        - velocity.x * SELECTION_VELOCITY_DAMPING * Math.sqrt(firm);
      const pullY = (anchor.y - body.position.y) * SELECTION_SPRING_STRENGTH * selectedIcon.boost * firm
        - velocity.y * SELECTION_VELOCITY_DAMPING * Math.sqrt(firm);
      Matter.Body.applyForce(body, body.position, {
        x: (pullX - engine.gravity.x * engine.gravity.scale) * body.mass,
        y: (pullY - engine.gravity.y * engine.gravity.scale) * body.mass,
      });
      const brisk = selectedIcon.arrived ? 7 : 1;
      body.torque += (
        -lean * SELECTION_ROTATION_STRENGTH * brisk
        - Matter.Body.getAngularVelocity(body) * SELECTION_ROTATION_DAMPING * Math.sqrt(brisk)
      ) * body.inertia;
    }

    function updateSelectedIconDeparture() {
      if (!selectedIcon?.announced) return;
      const body = iconBodies[selectedIcon.index];
      const anchor = selectedIcon.getSelectionAnchor();
      const distance = Math.hypot(anchor.x - body.position.x, anchor.y - body.position.y);
      if (distance <= Math.max(48, size * selectedIcon.scale * 0.6)) return;
      selectedIcon.announced = false;
      selectedIcon.stableFor = 0;
      onDeparted?.(selectedIcon.index);
    }

    function limitBodySpeeds(delta: number) {
      const perStep = FRAME_DURATION_MS / delta;
      for (const index of activeBodyIndexes) {
        const body = iconBodies[index];
        if (body.isSleeping) continue;
        const calculateSelectedIconScale = selectedIcon?.index === index ? selectedIcon.scale : 1;
        const maximum = size * calculateSelectedIconScale * 0.45 * perStep;
        const speed = Matter.Body.getSpeed(body);
        if (speed <= maximum) continue;
        const velocity = Matter.Body.getVelocity(body);
        Matter.Body.setVelocity(body, {
          x: (velocity.x * maximum) / speed,
          y: (velocity.y * maximum) / speed,
        });
      }
    }

    function drawIconBody(index: number) {
      const sprite = iconSprites[index];
      if (!sprite) return;
      const body = iconBodies[index];
      const drawnSize = size * (selectedIcon?.index === index ? selectedIcon.scale : 1);
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

    function redrawCanvas() {
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      for (const index of activeBodyIndexes) {
        if (selectedIcon?.index !== index) drawIconBody(index);
      }
      if (selectedIcon && activeBodyIndexes.has(selectedIcon.index)) drawIconBody(selectedIcon.index);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function layoutIconsWithoutMotion() {
      const spacingX = size * 0.82;
      const columns = Math.max(1, Math.floor(Math.max(size, width - size * 0.5) / spacingX));
      const visibleColumns = Math.min(columns, iconBodies.length);
      const startX = (width - Math.max(0, visibleColumns - 1) * spacingX) / 2;

      for (let index = 0; index < iconBodies.length; index += 1) {
        activateIconBody(index);
        const body = iconBodies[index];
        if (selectedIcon?.index === index) continue;
        const row = Math.floor(index / columns);
        const column = index % columns;
        const stagger = row % 2 === 0 ? 0 : spacingX * 0.22;
        Matter.Body.setPosition(body, {
          x: Math.min(width - size / 2, Math.max(size / 2, startX + column * spacingX + stagger)),
          y: Math.max(size / 2, height - size / 2 - row * size * 0.72),
        });
        Matter.Body.setAngle(body, ((index % 7) - 3) * 0.035);
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(body, 0);
        Matter.Sleeping.set(body, true);
      }

      if (selectedIcon) {
        const body = iconBodies[selectedIcon.index];
        Matter.Body.setPosition(body, selectedIcon.getSelectionAnchor());
        Matter.Body.setAngle(body, 0);
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(body, 0);
        Matter.Sleeping.set(body, true);
      }
      needsRedraw = true;
      nextIconDropIndex = iconBodies.length;
    }

    if (reducedMotion) {
      layoutIconsWithoutMotion();
      redrawCanvas();
    }

    function runAnimationFrame(now: number) {
      if (isDisposed) return;
      animationFrameId = 0;
      const elapsed = Math.min(now - previousFrameTimestamp, 120);
      previousFrameTimestamp = now;

      if (!reducedMotion) {
        const gap = Math.min(50, 3600 / Math.max(1, iconBodies.length));
        let poured = 0;
        while (nextIconDropIndex < iconBodies.length && now >= nextIconDropTimestamp && poured < 12) {
          activateIconBody(nextIconDropIndex);
          nextIconDropIndex += 1;
          nextIconDropTimestamp = Math.max(nextIconDropTimestamp + gap, now - 100);
          poured += 1;
          needsRedraw = true;
        }

        accumulatedPhysicsTime += elapsed;
        let ran = 0;
        while (accumulatedPhysicsTime >= PHYSICS_TIMESTEP_MS && ran < MAX_PHYSICS_STEPS_PER_FRAME) {
          applySelectionForces(PHYSICS_TIMESTEP_MS);
          limitBodySpeeds(PHYSICS_TIMESTEP_MS);
          Matter.Engine.update(engine, PHYSICS_TIMESTEP_MS);
          accumulatedPhysicsTime -= PHYSICS_TIMESTEP_MS;
          ran += 1;
        }
        if (accumulatedPhysicsTime > PHYSICS_TIMESTEP_MS * MAX_PHYSICS_STEPS_PER_FRAME) accumulatedPhysicsTime = 0;

        let awake = false;
        for (const index of activeBodyIndexes) {
          if (!iconBodies[index].isSleeping) {
            awake = true;
            break;
          }
        }
        if (awake) needsRedraw = true;
      }

      updateSelectedIconDeparture();

      if (now - lastBoundaryCheckTimestamp > 1000) {
        lastBoundaryCheckTimestamp = now;
        if (!isCeilingClosed && activeBodyIndexes.size === iconBodies.length && [...activeBodyIndexes].every((index) => iconBodies[index].position.y > size)) {
          isCeilingClosed = true;
          rebuildBoundaryBodies();
        }
        for (const index of activeBodyIndexes) {
          if (selectedIcon?.index === index) continue;
          const body = iconBodies[index];
          const outside = body.position.x < -size
            || body.position.x > width + size
            || body.position.y > height + size
            || (isCeilingClosed && body.position.y < -CEILING_HEADROOM - size)
            || Number.isNaN(body.position.x + body.position.y);
          if (!outside) continue;
          Matter.Body.setPosition(body, { x: width * (0.3 + Math.random() * 0.4), y: size * 2 });
          Matter.Body.setVelocity(body, { x: 0, y: 0 });
          Matter.Sleeping.set(body, false);
          needsRedraw = true;
        }
      }

      if (!hasNotifiedSettled && activeBodyIndexes.size === iconBodies.length && now - lastSettleCheckTimestamp >= 120) {
        lastSettleCheckTimestamp = now;
        const quiet = iconBodies.every((body) => body.isSleeping || (
          Matter.Body.getSpeed(body) < 0.15
          && Math.abs(Matter.Body.getAngularVelocity(body)) < 0.015
        ));
        if (quiet) {
          quietStartTimestamp ??= now;
          if (now - quietStartTimestamp >= 700) {
            hasNotifiedSettled = true;
            for (const body of iconBodies) Matter.Sleeping.set(body, true);
            onSettled?.();
          }
        } else {
          quietStartTimestamp = null;
        }
      }

      if (needsRedraw) {
        redrawCanvas();
        needsRedraw = false;
      }

      const moving = [...activeBodyIndexes].some((index) => !iconBodies[index].isSleeping);
      if (nextIconDropIndex < iconBodies.length || !hasNotifiedSettled || activePointerDrag || moving || needsRedraw) scheduleAnimationFrame();
    }

    scheduleAnimationFrame();
    apiRef.current = { select: selectIcon, release: releaseSelectedIcon };

    function getCanvasPointFromPointer(event: PointerEvent): CanvasPoint {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function handlePointerDown(event: PointerEvent) {
      if (activePointerDrag || !event.isPrimary || event.button !== 0) return;
      const point = getCanvasPointFromPointer(event);
      const found = Matter.Query.point([...activeBodyIndexes].map((index) => iconBodies[index]), point);
      const body = found.find((candidate) => selectedIcon?.index === iconBodies.indexOf(candidate)) ?? found.at(-1);
      if (!body) return;
      const index = iconBodies.indexOf(body);
      if (index < 0) return;

      Matter.Sleeping.set(body, false);
      if (selectedIcon?.index === index) {
        selectedIcon.stableFor = 0;
        body.collisionFilter.mask = 0xffffffff;
      }
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
      activePointerDrag = {
        pointerId: event.pointerId,
        index,
        start: point,
        lastPoint: point,
        travel: 0,
        startedAt: performance.now(),
        constraint,
      };
      canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
      needsRedraw = true;
      scheduleAnimationFrame();
    }

    function handlePointerMove(event: PointerEvent) {
      if (!activePointerDrag || event.pointerId !== activePointerDrag.pointerId) return;
      const point = getCanvasPointFromPointer(event);
      activePointerDrag.travel += Math.hypot(point.x - activePointerDrag.lastPoint.x, point.y - activePointerDrag.lastPoint.y);
      activePointerDrag.lastPoint = point;
      activePointerDrag.constraint.pointA = point;
      const body = iconBodies[activePointerDrag.index];
      if (reducedMotion) {
        Matter.Body.setPosition(body, point);
      } else {
        Matter.Sleeping.set(body, false);
      }
      needsRedraw = true;
      scheduleAnimationFrame();
    }

    function finishPointerDrag(event?: PointerEvent, pick = false) {
      if (!activePointerDrag || (event && event.pointerId !== activePointerDrag.pointerId)) return;
      const { pointerId, index, start, lastPoint, travel, startedAt, constraint } = activePointerDrag;
      activePointerDrag = null;
      Matter.Composite.remove(engine.world, constraint);
      const body = iconBodies[index];
      if (selectedIcon?.index === index && selectedIcon.arrived) body.collisionFilter.mask = 0;
      const releasePoint = event ? getCanvasPointFromPointer(event) : null;
      const totalTravel = releasePoint
        ? travel + Math.hypot(releasePoint.x - lastPoint.x, releasePoint.y - lastPoint.y)
        : Infinity;
      const displacement = releasePoint
        ? Math.hypot(releasePoint.x - start.x, releasePoint.y - start.y)
        : Infinity;
      const deliberateClick = pick && releasePoint
        && totalTravel <= 6
        && displacement <= 6
        && performance.now() - startedAt <= 500
        && Matter.Query.point([body], releasePoint).length > 0;
      if (reducedMotion) {
        if (selectedIcon?.index === index) {
          const anchor = selectedIcon.getSelectionAnchor();
          Matter.Body.setPosition(body, anchor);
          Matter.Body.setAngle(body, 0);
          Matter.Body.setVelocity(body, { x: 0, y: 0 });
          Matter.Body.setAngularVelocity(body, 0);
          Matter.Sleeping.set(body, true);
          if (!isDisposed && !selectedIcon.announced) {
            selectedIcon.announced = true;
            onArrived?.(index);
          }
        } else {
          Matter.Sleeping.set(body, true);
        }
      }
      if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
      if (deliberateClick) onPick(index);
      needsRedraw = true;
      scheduleAnimationFrame();
    }

    function handlePointerUp(event: PointerEvent) {
      finishPointerDrag(event, true);
    }

    function handlePointerCancel(event: PointerEvent) {
      finishPointerDrag(event);
    }

    function handleKeyboardSelection(event: KeyboardEvent) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (!iconBodies.length) return;
      const choices = activeBodyIndexes.size ? [...activeBodyIndexes] : [0];
      const current = selectedIcon?.index ?? -1;
      const next = choices.find((index) => index > current) ?? choices[0];
      if (next !== undefined) onPick(next);
    }

    function handleWindowBlur() {
      finishPointerDrag();
    }

    let resizeFrame = 0;

    function handleWindowResize() {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        resizeCanvas();
        if (reducedMotion) {
          layoutIconsWithoutMotion();
        } else {
          for (const index of activeBodyIndexes) {
            const body = iconBodies[index];
            if (selectedIcon?.index === index) continue;
            if (body.position.x < 0 || body.position.x > width || body.position.y > height + size) {
              Matter.Body.setPosition(body, { x: width / 2, y: -size });
              Matter.Body.setVelocity(body, { x: 0, y: 0 });
              Matter.Sleeping.set(body, false);
            }
          }
        }
      });
    }

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerCancel);
    canvas.addEventListener("lostpointercapture", handlePointerCancel);
    canvas.addEventListener("keydown", handleKeyboardSelection);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("resizeCanvas", handleWindowResize);
    onReady?.();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      cancelAnimationFrame(resizeFrame);
      finishPointerDrag();
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerCancel);
      canvas.removeEventListener("lostpointercapture", handlePointerCancel);
      canvas.removeEventListener("keydown", handleKeyboardSelection);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("resizeCanvas", handleWindowResize);
      for (const image of iconImages) {
        if (!image) continue;
        image.onload = null;
        image.onerror = null;
      }
      apiRef.current = null;
      Matter.Composite.clear(engine.world, false);
      Matter.Engine.clear(engine);
    };
  }, [apiRef, items, onPick, onReady, onSettled, onArrived, onDeparted]);

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
