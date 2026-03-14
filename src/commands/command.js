/** Base command interface. All game actions extend this. */
export class Command {
  execute(world) { throw new Error('Command.execute() not implemented'); }
  undo(world) { throw new Error('Command.undo() not implemented'); }
}
