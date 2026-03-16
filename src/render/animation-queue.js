export class AnimationQueue {
  constructor() {
    this.animations = [];
    this.particles = [];
  }
  
  // Add an animation to the queue
  addAnimation(animation) {
    this.needsRedraw = true;
    this.animations.push({
      ...animation,
      startTime: Date.now(),
      completed: false
    });
  }
  
  // Add particle effect
  addParticles(x, y, count = 5, color = '#ffffff', lifetime = 1000, speed = 50) {
    this.needsRedraw = true;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        color,
        lifetime,
        startTime: Date.now(),
        size: Math.random() * 3 + 1
      });
    }
  }
  
  // Update animations and particles
  update() {
    const now = Date.now();
    
    // Update animations
    this.animations = this.animations.filter(anim => {
      const elapsed = now - anim.startTime;
      if (elapsed >= anim.duration) {
        anim.completed = true;
        if (anim.onComplete) anim.onComplete();
        return false; // Remove completed animation
      }
      return true;
    });
    
    // Update particles
    this.particles = this.particles.filter(particle => {
      const elapsed = now - particle.startTime;
      if (elapsed >= particle.lifetime) {
        return false; // Remove expired particle
      }
      
      // Update particle position
      particle.x += particle.vx * 0.016; // Assuming 60fps
      particle.y += particle.vy * 0.016;
      
      // Apply gravity or other effects
      particle.vy += 0.1; // Simple gravity
      
      return true;
    });
  }
  
  // Render animations and particles
  render(ctx, camera = { x: 0, y: 0 }) {
    // Render particles
    this.particles.forEach(particle => {
      const elapsed = Date.now() - particle.startTime;
      const alpha = 1 - (elapsed / particle.lifetime);
      
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(
        particle.x - camera.x,
        particle.y - camera.y,
        particle.size,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    });
    
    // Render active animations
    this.animations.forEach(anim => {
      if (anim.render) {
        anim.render(ctx, anim, camera);
      }
    });
  }
  
  // Predefined animation effects
  static createHitEffect(x, y) {
    return {
      type: 'hit',
      x,
      y,
      duration: 200,
      render: (ctx, anim, camera) => {
        const elapsed = Date.now() - anim.startTime;
        const progress = elapsed / anim.duration;
        
        ctx.save();
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 3 * (1 - progress);
        ctx.globalAlpha = 1 - progress;
        
        const size = 20 + progress * 10;
        ctx.beginPath();
        ctx.arc(anim.x - camera.x, anim.y - camera.y, size, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
      }
    };
  }
  
  static createMissEffect(x, y) {
    return {
      type: 'miss',
      x,
      y,
      duration: 300,
      render: (ctx, anim, camera) => {
        const elapsed = Date.now() - anim.startTime;
        const progress = elapsed / anim.duration;
        
        ctx.save();
        ctx.strokeStyle = '#ffff44';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 1 - progress;
        
        // Draw swish lines
        const length = 30;
        const angle1 = Math.PI / 4;
        const angle2 = -Math.PI / 6;
        
        ctx.beginPath();
        ctx.moveTo(anim.x - camera.x, anim.y - camera.y);
        ctx.lineTo(
          anim.x - camera.x + Math.cos(angle1) * length,
          anim.y - camera.y + Math.sin(angle1) * length
        );
        ctx.moveTo(anim.x - camera.x, anim.y - camera.y);
        ctx.lineTo(
          anim.x - camera.x + Math.cos(angle2) * length,
          anim.y - camera.y + Math.sin(angle2) * length
        );
        ctx.stroke();
        
        ctx.restore();
      }
    };
  }
  
  static createScreenShake(intensity = 5, duration = 200) {
    return {
      type: 'screenShake',
      intensity,
      duration,
      render: (ctx, anim) => {
        const elapsed = Date.now() - anim.startTime;
        const progress = elapsed / anim.duration;
        
        if (progress < 1) {
          const shakeX = (Math.random() - 0.5) * anim.intensity * (1 - progress);
          const shakeY = (Math.random() - 0.5) * anim.intensity * (1 - progress);
          
          ctx.translate(shakeX, shakeY);
        }
      }
    };
  }
  
  static createHealEffect(x, y) {
    return {
      type: 'heal',
      x,
      y,
      duration: 500,
      render: (ctx, anim, camera) => {
        const elapsed = Date.now() - anim.startTime;
        const progress = elapsed / anim.duration;
        
        ctx.save();
        ctx.strokeStyle = '#44ff44';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 1 - progress;
        
        // Draw healing cross
        const size = 15;
        ctx.beginPath();
        ctx.moveTo(anim.x - camera.x - size, anim.y - camera.y);
        ctx.lineTo(anim.x - camera.x + size, anim.y - camera.y);
        ctx.moveTo(anim.x - camera.x, anim.y - camera.y - size);
        ctx.lineTo(anim.x - camera.x, anim.y - camera.y + size);
        ctx.stroke();
        
        // Draw expanding circle
        ctx.beginPath();
        ctx.arc(anim.x - camera.x, anim.y - camera.y, size * progress, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
      }
    };
  }
  
  // Clear all animations and particles
  clear() {
    this.animations = [];
    this.particles = [];
  }
  
  // Check if any animations are active
  hasActiveAnimations() {
    return this.animations.length > 0 || this.particles.length > 0;
  }
}
