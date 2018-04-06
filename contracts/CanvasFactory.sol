pragma solidity 0.4.21;

import "./TimeAware.sol";

/**
* @dev This contract takes care of painting on canvases, returning artworks and creating ones. 
*/
contract CanvasFactory is TimeAware {

    uint8 public constant WIDTH = 64;
    uint8 public constant HEIGHT = 64;
    uint32 public constant PIXEL_COUNT = 4096; //WIDTH * HEIGHT doesn't work for some reason

    uint8 public constant MAX_CANVAS_COUNT = 100;
    uint8 public constant MAX_ACTIVE_CANVAS = 10;

    Canvas[] artworks;
    uint32 public activeCanvasCount = 0;

    event PixelPainted(uint32 _canvasId, uint32 _index, uint8 _color);
    event CanvasFinished(uint32 _canvasId);
    event CanvasCreated(uint _id);

    modifier notFinished(uint32 _canvasId) {
        require(!isCanvasFinished(_canvasId));
        _;
    }

    modifier finished(uint32 _canvasId) {
        require(isCanvasFinished(_canvasId));
        _;
    }

    modifier validPixelIndex(uint32 _pixelIndex) {
        require(_pixelIndex < PIXEL_COUNT);
        _;
    }

    function createCanvas() external returns (uint canvasId) {
        require(artworks.length < MAX_CANVAS_COUNT);
        require(activeCanvasCount < MAX_ACTIVE_CANVAS);

        uint id = artworks.push(Canvas(0, 0)) - 1;

        CanvasCreated(id);
        activeCanvasCount++;

        return id;
    }

    function setPixel(uint32 _canvasId, uint32 _index, uint8 _color) external notFinished(_canvasId) validPixelIndex(_index) {
        require(_color > 0);

        Canvas storage canvas = _getCanvas(_canvasId);
        Pixel storage pixel = canvas.pixels[_index];

        // pixel always has a painter. If it's equal to address(0) it means 
        // that pixel hasn't been set.
        if (pixel.painter == 0x0) {
            canvas.paintedPixelsCount++;
        }

        Pixel memory newPixel = Pixel(_color, msg.sender);
        canvas.pixels[_index] = newPixel;

        if (_isCanvasFinished(canvas)) {
            activeCanvasCount--;
            CanvasFinished(_canvasId);
        }

        PixelPainted(_canvasId, _index, _color);
    }

    function getBitmap(uint32 _canvasId) external view returns (uint8[]) {
        Canvas storage canvas = _getCanvas(_canvasId);
        uint8[] memory result = new uint8[](PIXEL_COUNT);

        for (uint32 i = 0; i < PIXEL_COUNT; i++) {
            result[i] = canvas.pixels[i].color;
        }

        return result;
    }

    function getActiveCanvases() external view returns (uint32[]) {
        uint32[] memory result = new uint32[](activeCanvasCount);
        uint currentIndex = 0;

        for (uint32 i = 0; i < artworks.length; i++) {
            if (!isCanvasFinished(i)) {
                result[currentIndex] = i;
                currentIndex++;
            }
        }

        return result;
    }

    function getCanvasPaintedPixels(uint32 _canvasId) public view returns (uint32) {
        return _getCanvas(_canvasId).paintedPixelsCount;
    }

    function getPixelCount() external pure returns (uint) {
        return PIXEL_COUNT;
    }

    /**
    * @notice   Returns amount of created canvases.
    */
    function getCanvasCount() external view returns (uint) {
        return artworks.length;
    }

    function isCanvasFinished(uint32 _canvasId) public view returns (bool) {
        return _isCanvasFinished(_getCanvas(_canvasId));
    }

    function getPixelAuthor(uint32 _canvasId, uint32 _pixelIndex) public view validPixelIndex(_pixelIndex) returns (address) {
        return _getCanvas(_canvasId).pixels[_pixelIndex].painter;
    }

    function countPaintedPixelsByAddress(address _address, uint32 _canvasId) public view returns (uint32) {
        Canvas storage canvas = _getCanvas(_canvasId);
        uint32 count = 0;

        for (uint32 i = 0; i < PIXEL_COUNT; i++) {
            if (canvas.pixels[i].painter == _address) {
                count++;
            }
        }

        return count;
    }

    function _isCanvasFinished(Canvas canvas) internal pure returns (bool) {
        return canvas.paintedPixelsCount == PIXEL_COUNT;
    }

    function _getCanvas(uint32 _canvasId) internal view returns (Canvas storage) {
        require(_canvasId < artworks.length);
        return artworks[_canvasId];
    }

    struct Pixel {
        uint8 color;
        address painter;
    }

    struct Canvas {
        /**
        * Map of all pixels. 
        */
        mapping(uint32 => Pixel) pixels;

        /**
        * Owner of canvas. Canvas doesn't have an owner until initial bidding ends. 
        */
        address owner;

        /**
        * Numbers of pixels set. Canvas will be considered finished when all pixels will be set.
        * Technically it means that setPixelsCount == PIXEL_COUNT
        */
        uint32 paintedPixelsCount;
    }
}