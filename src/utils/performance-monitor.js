export class PerformanceMonitor {
  constructor() {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fps = 0;
    this.frameTime = 0;
    this.averageFrameTime = 0;
    this.minFrameTime = Infinity;
    this.maxFrameTime = 0;
    this.samples = [];
    this.maxSamples = 60; // Track last 60 frames
    
    this.enabled = true;
  }
  
  beginFrame() {
    if (!this.enabled) return;
    this.frameStartTime = performance.now();
  }
  
  endFrame() {
    if (!this.enabled) return;
    
    const now = performance.now();
    this.frameCount++;
    
    // Calculate frame time
    this.frameTime = now - this.frameStartTime;
    
    // Update min/max
    this.minFrameTime = Math.min(this.minFrameTime, this.frameTime);
    this.maxFrameTime = Math.max(this.maxFrameTime, this.frameTime);
    
    // Add to samples for rolling average
    this.samples.push(this.frameTime);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
    
    // Calculate rolling average
    this.averageFrameTime = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    
    // Calculate FPS every second
    if (now - this.lastTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
      this.frameCount = 0;
      this.lastTime = now;
      
      // Reset min/max every second
      this.minFrameTime = Infinity;
      this.maxFrameTime = 0;
    }
  }
  
  getMetrics() {
    return {
      fps: this.fps,
      currentFrameTime: this.frameTime,
      averageFrameTime: this.averageFrameTime,
      minFrameTime: this.minFrameTime,
      maxFrameTime: this.maxFrameTime,
      frameTimeVariance: this.maxFrameTime - this.minFrameTime
    };
  }
  
  isPerformanceGood() {
    // Target: 60 FPS (16.67ms per frame)
    const targetFrameTime = 1000 / 60;
    return this.averageFrameTime <= targetFrameTime * 1.2; // Allow 20% variance
  }
  
  logMetrics() {
    const metrics = this.getMetrics();
    console.log(`FPS: ${metrics.fps}, Avg Frame: ${metrics.averageFrameTime.toFixed(2)}ms, Min: ${metrics.minFrameTime.toFixed(2)}ms, Max: ${metrics.maxFrameTime.toFixed(2)}ms`);
  }
  
  setEnabled(enabled) {
    this.enabled = enabled;
  }
  
  // Performance profiling helpers
  timeFunction(fn, label = 'Function') {
    if (!this.enabled) return fn();
    
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    console.log(`${label} took ${(end - start).toFixed(2)}ms`);
    return result;
  }
  
  async timeAsyncFunction(fn, label = 'Async Function') {
    if (!this.enabled) return await fn();
    
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    
    console.log(`${label} took ${(end - start).toFixed(2)}ms`);
    return result;
  }
}
