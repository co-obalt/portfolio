// Magic UI Smooth Cursor (Official Port from registry/magicui/smooth-cursor.tsx)
(function () {
  'use strict';

  // Desktop pointer check matching DESKTOP_POINTER_QUERY
  const DESKTOP_POINTER_QUERY = '(any-hover: hover) and (any-pointer: fine)';
  const mediaQuery = window.matchMedia(DESKTOP_POINTER_QUERY);

  if (!mediaQuery.matches) {
    return;
  }

  // Create or grab cursor container
  let cursorEl = document.getElementById('smooth-cursor');
  if (!cursorEl) {
    cursorEl = document.createElement('div');
    cursorEl.id = 'smooth-cursor';
    document.body.appendChild(cursorEl);
  }

  // Exact DefaultCursorSVG from Magic UI registry
  cursorEl.innerHTML = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="50"
      height="54"
      viewBox="0 0 50 54"
      fill="none"
      style="display: block; transform: scale(0.5); transform-origin: center center;"
    >
      <g filter="url(#filter0_d_smooth_cursor)">
        <path
          d="M42.6817 41.1495L27.5103 6.79925C26.7269 5.02557 24.2082 5.02558 23.3927 6.79925L7.59814 41.1495C6.75833 42.9759 8.52712 44.8902 10.4125 44.1954L24.3757 39.0496C24.8829 38.8627 25.4385 38.8627 25.9422 39.0496L39.8121 44.1954C41.6849 44.8902 43.4884 42.9759 42.6817 41.1495Z"
          fill="black"
        />
        <path
          d="M43.7146 40.6933L28.5431 6.34306C27.3556 3.65428 23.5772 3.69516 22.3668 6.32755L6.57226 40.6778C5.3134 43.4156 7.97238 46.298 10.803 45.2549L24.7662 40.109C25.0221 40.0147 25.2999 40.0156 25.5494 40.1082L39.4193 45.254C42.2261 46.2953 44.9254 43.4347 43.7146 40.6933Z"
          stroke="white"
          stroke-width="2.25825"
        />
      </g>
      <defs>
        <filter
          id="filter0_d_smooth_cursor"
          x="0.602397"
          y="0.952444"
          width="49.0584"
          height="52.428"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="2.25825" />
          <feGaussianBlur stdDeviation="2.25825" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_smooth_cursor"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_smooth_cursor"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  `;

  // Spring parameters matching Magic UI
  const posSpring = { damping: 45, stiffness: 400, mass: 1 };
  const rotSpring = { damping: 60, stiffness: 300, mass: 1 };
  const sclSpring = { damping: 35, stiffness: 500, mass: 1 };

  // Spring State
  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;
  let vx = 0, vy = 0;

  let targetRotation = 0;
  let currentRotation = 0;
  let vRot = 0;

  let targetScale = 1;
  let currentScale = 1;
  let vScale = 0;

  let lastMousePos = { x: 0, y: 0 };
  let velocity = { x: 0, y: 0 };
  let lastUpdateTime = performance.now();
  let previousAngle = 0;
  let accumulatedRotation = 0;

  let isInitialized = false;
  let isVisible = false;
  let scaleTimeout = null;

  function updateVelocity(currentPos) {
    const currentTime = performance.now();
    const deltaTime = currentTime - lastUpdateTime;

    if (deltaTime > 0) {
      velocity = {
        x: (currentPos.x - lastMousePos.x) / deltaTime,
        y: (currentPos.y - lastMousePos.y) / deltaTime,
      };
    }

    lastUpdateTime = currentTime;
    lastMousePos = currentPos;
  }

  function smoothPointerMove(e) {
    if (e.pointerType === 'touch') return;

    if (!isInitialized) {
      currentX = targetX = e.clientX;
      currentY = targetY = e.clientY;
      lastMousePos = { x: e.clientX, y: e.clientY };
      lastUpdateTime = performance.now();
      isInitialized = true;
    }

    if (!isVisible) {
      isVisible = true;
      cursorEl.style.opacity = '1';
    }

    const currentPos = { x: e.clientX, y: e.clientY };
    targetX = currentPos.x;
    targetY = currentPos.y;

    updateVelocity(currentPos);

    const speed = Math.sqrt(
      Math.pow(velocity.x, 2) + Math.pow(velocity.y, 2)
    );

    if (speed > 0.1) {
      const currentAngle =
        Math.atan2(velocity.y, velocity.x) * (180 / Math.PI) + 90;

      let angleDiff = currentAngle - previousAngle;
      if (angleDiff > 180) angleDiff -= 360;
      if (angleDiff < -180) angleDiff += 360;
      accumulatedRotation += angleDiff;
      targetRotation = accumulatedRotation;
      previousAngle = currentAngle;

      targetScale = 0.95;

      if (scaleTimeout !== null) {
        clearTimeout(scaleTimeout);
      }

      scaleTimeout = setTimeout(() => {
        targetScale = 1;
      }, 150);
    }
  }

  let rafMoveId = 0;
  function throttledPointerMove(e) {
    if (e.pointerType === 'touch') return;
    if (rafMoveId) return;

    rafMoveId = requestAnimationFrame(() => {
      smoothPointerMove(e);
      rafMoveId = 0;
    });
  }

  window.addEventListener('pointermove', throttledPointerMove, { passive: true });

  document.addEventListener('mouseleave', () => {
    isVisible = false;
    cursorEl.style.opacity = '0';
  });

  document.addEventListener('mouseenter', () => {
    if (isInitialized) {
      isVisible = true;
      cursorEl.style.opacity = '1';
    }
  });

  // Hover detection for interactive buttons/links
  document.addEventListener('mouseover', (e) => {
    const isClickable = e.target.closest('a, button, [role="button"], .tw-btn-circle, .portfolio-three-btn');
    if (isClickable) {
      targetScale = 1.15;
    }
  }, { passive: true });

  document.addEventListener('mouseout', (e) => {
    const isClickable = e.target.closest('a, button, [role="button"], .tw-btn-circle, .portfolio-three-btn');
    if (isClickable) {
      targetScale = 1.0;
    }
  }, { passive: true });

  // Physics animation loop using multi-substepping for rock-solid stability & zero lag
  let lastFrameTime = performance.now();

  function render(now) {
    requestAnimationFrame(render);

    if (!isInitialized) return;

    let dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    if (dt > 0.064) dt = 0.064; // clamp in case of background tab pause

    const steps = 6;
    const subDt = dt / steps;

    for (let i = 0; i < steps; i++) {
      // Position X
      const fx = posSpring.stiffness * (targetX - currentX) - posSpring.damping * vx;
      vx += (fx / posSpring.mass) * subDt;
      currentX += vx * subDt;

      // Position Y
      const fy = posSpring.stiffness * (targetY - currentY) - posSpring.damping * vy;
      vy += (fy / posSpring.mass) * subDt;
      currentY += vy * subDt;

      // Rotation
      const fRot = rotSpring.stiffness * (targetRotation - currentRotation) - rotSpring.damping * vRot;
      vRot += (fRot / rotSpring.mass) * subDt;
      currentRotation += vRot * subDt;

      // Scale
      const fScl = sclSpring.stiffness * (targetScale - currentScale) - sclSpring.damping * vScale;
      vScale += (fScl / sclSpring.mass) * subDt;
      currentScale += vScale * subDt;
    }

    // Hardware accelerated matrix transform matching Magic UI motion.div
    cursorEl.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%) rotate(${currentRotation}deg) scale(${currentScale})`;
  }

  requestAnimationFrame(render);
})();
