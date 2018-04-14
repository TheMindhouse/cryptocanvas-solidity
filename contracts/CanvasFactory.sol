pragma solidity 0.4.21;

import "./TimeAware.sol";

/**
* @dev This contract takes care of painting on canvases, returning artworks and creating ones. 
*/
contract CanvasFactory is TimeAware {

    //@dev It means canvas is not finished yet, and bidding is not possible.
    uint8 public constant STATE_NOT_FINISHED = 0;

    //@dev  there is ongoing bidding and anybody can bid. If there canvas can have
    //      assigned owner, but it can change if someone will over-bid him.
    uint8 public constant STATE_INITIAL_BIDDING = 1;

    //@dev canvas has been sold, and has the owner
    uint8 public constant STATE_OWNED = 2;

    uint8 public constant WIDTH = 64;
    uint8 public constant HEIGHT = 64;
    uint32 public constant PIXEL_COUNT = 4096; //WIDTH * HEIGHT doesn't work for some reason

    uint32 public constant MAX_CANVAS_COUNT = 1000;
    uint8 public constant MAX_ACTIVE_CANVAS = 10;

    Canvas[] canvases;
    uint32 public activeCanvasCount = 0;

    event PixelPainted(uint32 indexed canvasId, uint32 index, uint8 color);
    event CanvasFinished(uint32 indexed canvasId);
    event CanvasCreated(uint indexed canvasId);

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
        require(canvases.length < MAX_CANVAS_COUNT);
        require(activeCanvasCount < MAX_ACTIVE_CANVAS);

        uint id = canvases.push(Canvas(STATE_NOT_FINISHED, 0x0, 0, 0, false)) - 1;

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
        } else {
            canvas.addressToCount[pixel.painter]--;
        }

        canvas.addressToCount[msg.sender]++;
        canvas.pixels[_index] = Pixel(_color, msg.sender);

        if (_isCanvasFinished(canvas)) {
            activeCanvasCount--;
            canvas.state = STATE_INITIAL_BIDDING;
            CanvasFinished(_canvasId);
        }

        PixelPainted(_canvasId, _index, _color);
    }

    function getCanvasBitmap(uint32 _canvasId) external view returns (uint8[]) {
        Canvas storage canvas = _getCanvas(_canvasId);
        uint8[] memory result = new uint8[](PIXEL_COUNT);

        for (uint32 i = 0; i < PIXEL_COUNT; i++) {
            result[i] = canvas.pixels[i].color;
        }

        return result;
    }

    function getCanvasPaintedPixelsCount(uint32 _canvasId) public view returns (uint32) {
        return _getCanvas(_canvasId).paintedPixelsCount;
    }

    function getPixelCount() external pure returns (uint) {
        return PIXEL_COUNT;
    }

    /**
    * @notice   Returns amount of created canvases.
    */
    function getCanvasCount() public view returns (uint) {
        return canvases.length;
    }

    function isCanvasFinished(uint32 _canvasId) public view returns (bool) {
        return _isCanvasFinished(_getCanvas(_canvasId));
    }

    function getPixelAuthor(uint32 _canvasId, uint32 _pixelIndex) public view validPixelIndex(_pixelIndex) returns (address) {
        return _getCanvas(_canvasId).pixels[_pixelIndex].painter;
    }

    function getPaintedPixelsCountByAddress(address _address, uint32 _canvasId) public view returns (uint32) {
        Canvas storage canvas = _getCanvas(_canvasId);
        return canvas.addressToCount[_address];
    }

    function _isCanvasFinished(Canvas canvas) internal pure returns (bool) {
        return canvas.paintedPixelsCount == PIXEL_COUNT;
    }

    function _getCanvas(uint32 _canvasId) internal view returns (Canvas storage) {
        require(_canvasId < canvases.length);
        return canvases[_canvasId];
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

        uint8 state;

        /**
        * Owner of canvas. Canvas doesn't have an owner until initial bidding ends. 
        */
        address owner;

        /**
        * Numbers of pixels set. Canvas will be considered finished when all pixels will be set.
        * Technically it means that setPixelsCount == PIXEL_COUNT
        */
        uint32 paintedPixelsCount;

        mapping(address => uint32) addressToCount;


        /**
        * Initial bidding finish time.
        */
        uint initialBiddingFinishTime;

        /**
        * If commission from initial bidding has been paid.
        */
        bool isCommissionPaid;

        /**
        * @dev if address has been paid a reward for drawing.
        */
        mapping(address => bool) isAddressPaid;
    }
}