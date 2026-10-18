const { createCanvas } = require('canvas');

async function generateLast14DaysGraph(labels, rebirthData, prestigeData, username, timezone, settings = {}) {
  const width = 800;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const isLightTheme = settings.theme === 'light';
  const colors = {
    bg: isLightTheme ? '#FFFFFF' : '#2b2d31',
    grid: isLightTheme ? '#81868F' : '#ffffffda',
    text: isLightTheme ? '#060607' : '#ffffff',
    prestige: settings.prestigeColor || '#F1C40F',
    rebirth: settings.rebirthColor || '#2ECC71',
    legend: isLightTheme ? '#060607' : '#FFFFFF'
  };

  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, width, height);

  const sliceLabels = labels.slice(-14);
  const sliceRebirth = rebirthData.slice(-14);
  const slicePrestige = prestigeData.slice(-14);
  const adjustedRebirthData = sliceRebirth.map((rb, idx) => {
    const pres = slicePrestige[idx] || 0;
    return rb >= pres ? rb - pres : rb;
  });

  const maxRebirth = Math.max(...adjustedRebirthData, 0);
  const maxPrestige = Math.max(...slicePrestige, 0);
  const totalMaxData = adjustedRebirthData.map((rb, i) => rb + (slicePrestige[i] || 0));
  const absoluteMax = Math.max(...totalMaxData, 10);

  let startVal = 0;
  if (maxPrestige > 0) startVal = Math.floor(maxPrestige / 5) * 5;

  const targetLines = 20;
  const rawStep = (absoluteMax - startVal) / targetLines;
  let step = 5;
  if (rawStep > 5) step = Math.ceil(rawStep / 5) * 5;
  if (rawStep > 50) step = Math.ceil(rawStep / 50) * 50;
  if (rawStep > 500) step = Math.ceil(rawStep / 500) * 500;
  if (rawStep > 5000) step = Math.ceil(rawStep / 1000) * 1000;

  const customMax = Math.ceil(absoluteMax / step) * step;
  const yTicks = [];
  for (let tick = startVal; tick <= customMax; tick += step) yTicks.push(tick);

  ctx.font = '16px sans-serif';
  const maxTickLabelWidth = Math.max(
    ...yTicks.map(tick => ctx.measureText(String(tick)).width),
    ctx.measureText('0').width
  );
  const axisLabelGap = 12;
  const axisLabelBuffer = 12;
  const sidePadding = Math.max(
    40,
    Math.ceil(maxTickLabelWidth + axisLabelGap + axisLabelBuffer)
  );
  const paddingLeft = sidePadding;
  const paddingRight = sidePadding;
  const paddingTop = 70;
  const fixedChartHeight = 380;
  const paddingBottom = height - paddingTop - fixedChartHeight;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = fixedChartHeight;
  const legendChartGap = 40;
  const timezoneLegendGap = 28;
  const usernameTimezoneGap = 32;
  const usernameTopPadding = 18;
  const dateCharacterSpacing = 1.5;
  const baselineY = paddingTop + chartHeight;
  const totalTickSteps = Math.max(yTicks.length - 1, 1);
  const firstTick = yTicks[0] || 0;
  const zeroY = firstTick > 0
    ? baselineY + chartHeight / totalTickSteps
    : baselineY;

  const getValueY = (value) => {
    if (value <= firstTick) {
      if (firstTick <= 0) return baselineY;
      const lowerRangeRatio = Math.max(0, value / firstTick);
      return zeroY - lowerRangeRatio * (zeroY - baselineY);
    }
    if (value >= yTicks[yTicks.length - 1]) return paddingTop;

    for (let i = 0; i < yTicks.length - 1; i++) {
      const lowerTick = yTicks[i];
      const upperTick = yTicks[i + 1];
      if (value >= lowerTick && value <= upperTick) {
        const subRatio = (value - lowerTick) / (upperTick - lowerTick);
        const tickPosition = (i + subRatio) / totalTickSteps;
        return baselineY - tickPosition * chartHeight;
      }
    }
    return paddingTop;
  };

  const labelYPos = zeroY + 18;
  const legendY = paddingTop - legendChartGap;
  const timezoneY = legendY - timezoneLegendGap;
  const titleY = timezoneY - usernameTimezoneGap;
  const contentTop = titleY - usernameTopPadding;
  const contentBottom = labelYPos + 6;
  const verticalOffset = (height - (contentBottom - contentTop)) / 2 - contentTop;
  ctx.translate(0, verticalOffset);

  ctx.fillStyle = colors.text;
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(username, width / 2, titleY);
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(timezone, width / 2, timezoneY);
  ctx.font = '16px sans-serif';
  ctx.lineWidth = 0.75;

  yTicks.forEach((tickVal, tickIndex) => {
    const yPos = baselineY - (tickIndex / totalTickSteps) * chartHeight;
    ctx.strokeStyle = colors.grid;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, yPos);
    ctx.lineTo(width - paddingRight, yPos);
    ctx.stroke();
    ctx.fillStyle = colors.text;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(tickVal, paddingLeft - 8, yPos);
    ctx.textAlign = 'left';
    ctx.fillText(tickVal, width - paddingRight + 8, yPos);
  });

  const totalBars = sliceLabels.length;
  const slotWidth = chartWidth / totalBars;
  const barWidth = slotWidth * 0.75;
  sliceLabels.forEach((label, idx) => {
    const xCenter = paddingLeft + (idx * slotWidth) + (slotWidth / 2);
    const rbVal = adjustedRebirthData[idx] || 0;
    const prVal = slicePrestige[idx] || 0;
    if (prVal > 0) {
      const prY = getValueY(prVal);
      const prHeight = zeroY - prY;
      ctx.fillStyle = colors.prestige;
      ctx.fillRect(xCenter - (barWidth / 2), prY, barWidth, prHeight);
    }
    if (rbVal > 0) {
      const totalY = getValueY(rbVal + prVal);
      const rebirthBaseY = getValueY(prVal);
      const rbHeight = rebirthBaseY - totalY;
      ctx.fillStyle = colors.rebirth;
      ctx.fillRect(xCenter - (barWidth / 2), totalY, barWidth, rbHeight);
    }
  });

  ctx.strokeStyle = colors.grid;
  ctx.beginPath();
  ctx.moveTo(paddingLeft, zeroY);
  ctx.lineTo(width - paddingRight, zeroY);
  ctx.stroke();
  ctx.fillStyle = colors.text;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  ctx.fillText(0, paddingLeft - 8, zeroY);
  ctx.textAlign = 'left';
  ctx.fillText(0, width - paddingRight + 8, zeroY);

  sliceLabels.forEach((label, idx) => {
    const xCenter = paddingLeft + (idx * slotWidth) + (slotWidth / 2);
    ctx.save();
    ctx.translate(xCenter, labelYPos);
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.text;
    const characters = [...label];
    const characterWidths = characters.map(character => ctx.measureText(character).width);
    const labelWidth = characterWidths.reduce((total, characterWidth) => total + characterWidth, 0)
      + dateCharacterSpacing * Math.max(characters.length - 1, 0);
    let characterX = -labelWidth / 2;
    characters.forEach((character, characterIndex) => {
      ctx.textAlign = 'left';
      ctx.fillText(character, characterX, 0);
      characterX += characterWidths[characterIndex] + dateCharacterSpacing;
    });
    ctx.restore();
  });

  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const legendStartX = width / 2 - 110;
  ctx.fillStyle = colors.prestige;
  ctx.fillRect(legendStartX, legendY - 7.5, 15, 15);
  ctx.fillStyle = colors.legend;
  ctx.fillText('Prestige', legendStartX + 25, legendY);
  ctx.fillStyle = colors.rebirth;
  ctx.fillRect(legendStartX + 110, legendY - 7.5, 15, 15);
  ctx.fillStyle = colors.legend;
  ctx.fillText('Rebirth', legendStartX + 135, legendY);

  return canvas.toBuffer('image/png');
}

module.exports = { generateLast14DaysGraph };
