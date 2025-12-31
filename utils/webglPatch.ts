/**
 * WebGL Patch for React Three Fiber
 * 
 * This patch fixes the "Cannot read property 'trim' of undefined" error
 * that occurs in React Native/Expo when using React Three Fiber.
 * 
 * The error happens because Three.js tries to call .trim() on the result
 * of gl.getProgramInfoLog(), which can return null or undefined in some
 * React Native environments.
 * 
 * This patch should be imported early in the app lifecycle, preferably
 * in the main App.tsx or _layout.tsx file.
 */

// Patch WebGLRenderingContext
if (
  typeof global !== 'undefined' &&
  global.WebGLRenderingContext &&
  typeof global.WebGLRenderingContext.prototype.getProgramInfoLog === "function"
) {
  const original = global.WebGLRenderingContext.prototype.getProgramInfoLog;
  global.WebGLRenderingContext.prototype.getProgramInfoLog = function (...args) {
    const result = original.apply(this, args);
    return typeof result === "string" ? result : "";
  };
  
  console.log('[WebGL Patch] Applied getProgramInfoLog patch for WebGLRenderingContext');
}

// Patch WebGL2RenderingContext if available
if (
  typeof global !== 'undefined' &&
  global.WebGL2RenderingContext &&
  typeof global.WebGL2RenderingContext.prototype.getProgramInfoLog === "function"
) {
  const original = global.WebGL2RenderingContext.prototype.getProgramInfoLog;
  global.WebGL2RenderingContext.prototype.getProgramInfoLog = function (...args) {
    const result = original.apply(this, args);
    return typeof result === "string" ? result : "";
  };
  
  console.log('[WebGL Patch] Applied getProgramInfoLog patch for WebGL2RenderingContext');
}

// Additional patches for other potentially problematic WebGL methods
if (
  typeof global !== 'undefined' &&
  global.WebGLRenderingContext &&
  typeof global.WebGLRenderingContext.prototype.getShaderInfoLog === "function"
) {
  const original = global.WebGLRenderingContext.prototype.getShaderInfoLog;
  global.WebGLRenderingContext.prototype.getShaderInfoLog = function (...args) {
    const result = original.apply(this, args);
    return typeof result === "string" ? result : "";
  };
}

if (
  typeof global !== 'undefined' &&
  global.WebGL2RenderingContext &&
  typeof global.WebGL2RenderingContext.prototype.getShaderInfoLog === "function"
) {
  const original = global.WebGL2RenderingContext.prototype.getShaderInfoLog;
  global.WebGL2RenderingContext.prototype.getShaderInfoLog = function (...args) {
    const result = original.apply(this, args);
    return typeof result === "string" ? result : "";
  };
}

export default function applyWebGLPatches() {
  // This function can be called explicitly if needed
  console.log('[WebGL Patch] WebGL patches have been applied');
}
