import { Command } from './command.js';
import { DIR_VECTOR } from '../core/constants.js';

export class MoveForwardCommand extends Command {
  constructor() {
    super();
    this.triggeredCombat = false;
  }

  execute(world, soundManager) {
    this.triggeredCombat = false;
    const [dx, dy] = DIR_VECTOR[world.player.facing];
    const nx = world.player.x + dx;
    const ny = world.player.y + dy;
    if (!world.tileMap.isWalkable(nx, ny)) return false;
    
    // Check for monsters
    console.log(`Monster found:`, !!monster);
    if (monster) {
      this.triggeredCombat = true;
      // Trigger combat
      world.stateStack.pushCombat([monster]);
      return false; // Don't move if combat triggered
    }
    
    this._prevX = world.player.x;
    this._prevY = world.player.y;
    world.player.x = nx;
    world.player.y = ny;
    world.events.emit('playerMoved', { x: nx, y: ny });
    return true;
  }
  
  undo(world) {
    world.player.x = this._prevX;
    world.player.y = this._prevY;
  }
}

export class MoveBackwardCommand extends Command {
  execute(world, soundManager) {
    const [dx, dy] = DIR_VECTOR[world.player.facing];
    const nx = world.player.x - dx;
    const ny = world.player.y - dy;
    if (!world.tileMap.isWalkable(nx, ny)) return false;
    
    // Check for monsters
    const entities = world.tileMap.getEntitiesAt(nx, ny);
    console.log(`Moving to (${nx}, ${ny})`);
    const entities = world.tileMap.getEntitiesAt(nx, ny);
    console.log(`Entities at (${nx}, ${ny}):`, entities.length);
    const monster = entities.find(e => e.type === 'monster');
    console.log(`Monster found:`, !!monster);
    const entitiesAtTarget = world.tileMap.getEntitiesAt(nx, ny);
    const monster = entitiesAtTarget.find(e => e.type === 'monster');
    if (monster) {
      // Trigger combat
      world.stateStack.pushCombat([monster]);
      return false; // Don't move if combat triggered
    }
    
    this._prevX = world.player.x;
    this._prevY = world.player.y;
    world.player.x = nx;
    world.player.y = ny;
    world.events.emit('playerMoved', { x: nx, y: ny });
    return true;
  }
  
  undo(world) {
    world.player.x = this._prevX;
    world.player.y = this._prevY;
  }
}

export class StrafeLeftCommand extends Command {
  execute(world, soundManager) {
    const [fdx, fdy] = DIR_VECTOR[world.player.facing];
    const nx = world.player.x + fdy;
    const ny = world.player.y - fdx;
    if (!world.tileMap.isWalkable(nx, ny)) return false;
    
    // Check for monsters
    const entities = world.tileMap.getEntitiesAt(nx, ny);
    console.log(`Moving to (${nx}, ${ny})`);
    const entities = world.tileMap.getEntitiesAt(nx, ny);
    console.log(`Entities at (${nx}, ${ny}):`, entities.length);
    const monster = entities.find(e => e.type === 'monster');
    console.log(`Monster found:`, !!monster);
    const entitiesAtTarget = world.tileMap.getEntitiesAt(nx, ny);
    const monster = entitiesAtTarget.find(e => e.type === 'monster');
    if (monster) {
      // Trigger combat
      world.stateStack.pushCombat([monster]);
      return false; // Don't move if combat triggered
    }
    
    this._prevX = world.player.x;
    this._prevY = world.player.y;
    world.player.x = nx;
    world.player.y = ny;
    world.events.emit('playerMoved', { x: nx, y: ny });
    return true;
  }
  
  undo(world) {
    world.player.x = this._prevX;
    world.player.y = this._prevY;
  }
}

export class StrafeRightCommand extends Command {
  execute(world, soundManager) {
    const [fdx, fdy] = DIR_VECTOR[world.player.facing];
    const nx = world.player.x - fdy;
    const ny = world.player.y + fdx;
    if (!world.tileMap.isWalkable(nx, ny)) return false;
    
    // Check for monsters
    const entities = world.tileMap.getEntitiesAt(nx, ny);
    console.log(`Moving to (${nx}, ${ny})`);
    const entities = world.tileMap.getEntitiesAt(nx, ny);
    console.log(`Entities at (${nx}, ${ny}):`, entities.length);
    const monster = entities.find(e => e.type === 'monster');
    console.log(`Monster found:`, !!monster);
    const entitiesAtTarget = world.tileMap.getEntitiesAt(nx, ny);
    const monster = entitiesAtTarget.find(e => e.type === 'monster');
    if (monster) {
      // Trigger combat
      world.stateStack.pushCombat([monster]);
      return false; // Don't move if combat triggered
    }
    
    this._prevX = world.player.x;
    this._prevY = world.player.y;
    world.player.x = nx;
    world.player.y = ny;
    world.events.emit('playerMoved', { x: nx, y: ny });
    return true;
  }
  
  undo(world) {
    world.player.x = this._prevX;
    world.player.y = this._prevY;
  }
}

export class TurnLeftCommand extends Command {
  execute(world, soundManager) {
    this._prevFacing = world.player.facing;
    world.player.facing = (world.player.facing + 3) % 4;
    world.events.emit('playerTurned', { facing: world.player.facing });
    return true;
  }
  
  undo(world) {
    world.player.facing = this._prevFacing;
  }
}

export class TurnRightCommand extends Command {
  execute(world, soundManager) {
    this._prevFacing = world.player.facing;
    world.player.facing = (world.player.facing + 1) % 4;
    world.events.emit('playerTurned', { facing: world.player.facing });
    return true;
  }
  
  undo(world) {
    world.player.facing = this._prevFacing;
  }
}
