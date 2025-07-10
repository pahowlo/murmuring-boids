export class Background {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  constructor(width: number, height: number, color: string = "#000") {
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    document.body.appendChild(this.canvas);

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("2D context not supported");
    this.ctx = ctx;

    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, width, height);
  }
}
