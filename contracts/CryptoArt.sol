pragma solidity 0.4.21;

import "./CanvasMarket.sol";

/**
* @dev Contract to be placed in blockchain. Contains utility methods. 
*/
contract CryptoArt is CanvasMarket {

    function getCanvasInfo(uint32 _canvasId) external view returns (
        uint32 id,
        uint32 paintedPixels,
        bool isSecured,
        uint8 canvasState,
        uint initialBiddingFinishTime,
        address owner
    ) {
        Canvas storage canvas = _getCanvas(_canvasId);

        return (_canvasId, canvas.paintedPixelsCount, canvas.secured, getCanvasState(_canvasId),
        canvas.initialBiddingFinishTime, canvas.owner);
    }

} 