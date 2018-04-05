/**
 * Calling this function for huge set of pixels causes test failure! Don't call it with default
 * values [0 - 4096>, this set is too large!
 */
function fillCanvas(instance, canvasId, firstIndex = 0, lastIndex = 4096, color = 10) {
    const promises = [];
    for (let i = firstIndex; i < lastIndex; i++) {
        promises.push(instance.setPixel(canvasId, i, color));
    }

    return Promise.all(promises);
}

/**
 * Fills all canvas with 10 color.
 */
async function fillWholeCanvas(instance, canvasId) {
    for (let i = 0; i < 8; i++) {
        await fillCanvas(instance, canvasId, i * 512, (i + 1) * 512);
    }
}

export {fillCanvas, fillWholeCanvas}