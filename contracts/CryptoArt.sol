pragma solidity 0.4.23;

import "./CanvasMarket.sol";

/**
* @dev Contract to be placed in blockchain. Contains utility methods. 
*/
contract CryptoArt is CanvasMarket {

    function getCanvasInfo(uint32 _canvasId) external view returns (
        uint32 id,
        uint32 paintedPixels,
        uint8 canvasState,
        uint initialBiddingFinishTime,
        address owner
    ) {
        Canvas storage canvas = _getCanvas(_canvasId);

        return (_canvasId, canvas.paintedPixelsCount, getCanvasState(_canvasId),
        canvas.initialBiddingFinishTime, canvas.owner);
    }

    function getCanvasByOwner(address _owner) external view returns (uint32[]) {
        uint32[] memory result = new uint32[](canvases.length);
        uint currentIndex = 0;

        for (uint32 i = 0; i < canvases.length; i++) {
            if (getCanvasState(i) == STATE_OWNED) {
                Canvas storage canvas = _getCanvas(i);
                if (canvas.owner == _owner) {
                    result[currentIndex] = i;
                    currentIndex++;
                }
            }
        }

        return _slice(result, 0, currentIndex);
    }

    /**
    * @notice   Returns array of all the owners of all of pixels. If some pixel hasn't
    *           been painted yet, 0x0 address will be returned.
    */
    function getCanvasPainters(uint32 _canvasId) external view returns (address[]) {
        Canvas storage canvas = _getCanvas(_canvasId);
        address[] memory result = new address[](PIXEL_COUNT);

        for (uint32 i = 0; i < PIXEL_COUNT; i++) {
            result[i] = canvas.pixels[i].painter;
        }

        return result;
    }

} 