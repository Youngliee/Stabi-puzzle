(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EscapeResults = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function summarize(levels, best, rateStars) {
    const entries = levels.map((level, i) => {
      const moves = best && best[i];
      const completed = Number.isInteger(moves) && moves >= level.par && moves < 100000;
      return { number: i + 1, completed, moves: completed ? moves : null,
        stars: completed ? rateStars(moves, level.par) : 0 };
    });
    return {
      entries,
      totalLevels: levels.length,
      completed: entries.filter(entry => entry.completed).length,
      stars: entries.reduce((sum, entry) => sum + entry.stars, 0),
      maxStars: levels.length * 3,
      bestMoves: entries.reduce((sum, entry) => sum + (entry.moves || 0), 0),
      allComplete: levels.length > 0 && entries.every(entry => entry.completed)
    };
  }

  function shareText(result) {
    return 'I earned ' + result.stars + '/' + result.maxStars + ' stars in Stabi Escape!\n' +
      result.completed + '/' + result.totalLevels + ' levels cleared.\n' +
      'A fan-made puzzle for the Stabilizer community. #StabiEscape';
  }

  function box(ctx, x, y, width, height, radius) {
    ctx.beginPath();ctx.moveTo(x + radius, y);ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);ctx.quadraticCurveTo(x, y, x + radius, y);ctx.closePath();
  }

  function star(ctx, x, y, radius, color) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? radius * 0.45 : radius;
      const px = x + Math.cos(angle) * r, py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);else ctx.lineTo(px, py);
    }
    ctx.closePath();ctx.fillStyle = color;ctx.fill();
  }

  // Draw exact score data; reuse the active victory-screen mascot.
  function drawCard(ctx, result, mascot) {
    const width = 1200, height = 800;
    ctx.canvas.width = width;ctx.canvas.height = height;
    const background = ctx.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, '#071b1b');background.addColorStop(1, '#153e34');
    ctx.fillStyle = background;ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#426d5c';ctx.lineWidth = 2;box(ctx, 25, 25, 1150, 750, 27);ctx.stroke();
    function text(value, x, y, size, color, bold) {
      ctx.font = (bold ? '700 ' : '400 ') + size + 'px Arial, sans-serif';
      ctx.fillStyle = color;ctx.fillText(String(value), x, y);
    }
    text('MY PUZZLE SCORE', 72, 82, 23, '#a5c9ba', true);
    text('STABI ESCAPE', 68, 160, 68, '#eefaf6', true);
    text(result.stars, 66, 354, 168, '#99f7da', true);
    const scoreWidth = ctx.measureText(String(result.stars)).width;
    text('/ ' + result.maxStars, 83 + scoreWidth, 351, 75, '#b9d7ca', true);
    text('STARS COLLECTED', 73, 403, 25, '#f1cc79', true);
    ctx.strokeStyle = '#34574a';ctx.lineWidth = 2;ctx.beginPath();ctx.moveTo(73, 433);ctx.lineTo(723, 433);ctx.stroke();
    text(result.completed + ' / ' + result.totalLevels, 72, 495, 47, '#eefaf6', true);
    text('LEVELS CLEARED', 74, 531, 21, '#a5c9ba', true);
    text(result.bestMoves, 410, 495, 47, '#eefaf6', true);
    text('BEST MOVES · CLEARED LEVELS', 412, 531, 18, '#a5c9ba', true);
    ctx.fillStyle = '#1b534135';ctx.beginPath();ctx.arc(964, 342, 140, 0, Math.PI * 2);ctx.fill();
    ctx.strokeStyle = '#8befc34a';ctx.lineWidth = 2;ctx.beginPath();ctx.arc(964, 342, 140, 0, Math.PI * 2);ctx.stroke();
    if (mascot) {
      // Match the victory portrait's crop of the unchanged, supplied Stabi block.
      const crop={x:208,y:110,w:535,h:620},h=276,w=h*crop.w/crop.h,x=964-w/2,y=195;
      ctx.save();box(ctx,x,y,w,h,20);ctx.clip();ctx.fillStyle='#93f2d9';ctx.fillRect(x,y,w,h);
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      ctx.drawImage(mascot,crop.x,crop.y,crop.w,crop.h,x,y,w,h);ctx.restore();
    }
    text(result.allComplete ? 'ALL LEVELS CLEARED' : 'MY LEVEL PROGRESS', 73, 582, 21, '#99f7da', true);
    const step = 1056 / result.totalLevels;
    result.entries.forEach((entry, i) => {
      const x = 72 + i * step, cellWidth = step - 9;
      box(ctx, x, 603, cellWidth, 95, 11);ctx.fillStyle = entry.completed ? '#234c3e' : '#102c27';ctx.fill();
      ctx.strokeStyle = entry.completed ? '#55856c' : '#2b4b3d';ctx.stroke();
      ctx.textAlign = 'center';text(String(entry.number).padStart(2, '0'), x + cellWidth / 2, 637, 23, entry.completed ? '#eefaf6' : '#77968a', true);
      const starSpacing=Math.min(24,(cellWidth-16)/3),starRadius=Math.min(10,starSpacing*.42);
      for (let n = 0; n < 3; n++) star(ctx, x + cellWidth / 2 + (n - 1) * starSpacing, 674, starRadius, n < entry.stars ? '#f1cc79' : '#496354');
      ctx.textAlign = 'left';
    });
    text('PERSONAL BEST PER LEVEL', 73, 742, 19, '#9bbbad', true);
    ctx.textAlign = 'right';text('FAN-MADE · UNOFFICIAL', 1127, 742, 19, '#9bbbad', true);ctx.textAlign = 'left';
    return ctx.canvas;
  }
  return { summarize, shareText, drawCard };
});
