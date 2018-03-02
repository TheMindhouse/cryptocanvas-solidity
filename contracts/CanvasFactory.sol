pragma solidity 0.4.19;

import './Ownable.sol';

contract CanvasFactory {

    uint8 public constant WIDTH = 100;
    uint8 public constant HEIGHT = 100;
    uint32 public constant PIXEL_COUNT = WIDTH * HEIGHT; 
    uint public constant ADDRESS_COOLDOWN = 3 minutes;
    
    Canvas[] artworks;
    mapping (address => uint) addressToReadyTime;

    modifier onlyReadyAddress {
        require(addressToReadyTime[msg.sender] < now);
        _;
    }

    function setPixel(uint32 _artworkId, uint8 _x, uint8 _y, uint _color) public onlyReadyAddress {
        require(_x < WIDTH);
        require(_y < HEIGHT);

        Canvas storage canvas = _getCanvas(_artworkId);
        uint32 index = _getPixelIndex(_x, _y);

        Pixel pixel = canvas.pixels[index];
        if (pixel != 0) {
            canvas.addressToCount[pixel.painter]--;
        }
        canvas.addressToCount[msg.sender]++;

        Pixel newPixel = Pixel(_invertColor(_color), msg.sender);
        canval.pixels[index] = newPixel;

        addressToReadyTime[msg.sender] = now + ADDRESS_COOLDOWN;
    }

    function getArtwork(uint32 _artworkId) public view returns(uint8[]) {
        Canvas canvas = _getCanvas(_artworkId);
        uint8[] result = new uint8[](PIXEL_COUNT);

        for (var i = 0; i < PIXEL_COUNT; i++) {
            result[i] = _invertColor(canvas.pixels[i]);
        }

        return result; 
    }

    function _getCanvas(uint32 _artworkId) internal view returns(Canvas) {
        require(_artworkId < artworks.size);
        return artworks[_artworkId];
    }

    function _getPixelIndex(uint32 _x, uint32 _y) internal pure returns(uint32) {
        require(_x < WIDTH);
        require(_y < HEIGHT);

        return _y * WIDTH + _x;
    }

    function _invertColor(uint8 _color) internal pure returns(uint8) {
        return 0xFF - _color;
    }

    struct Pixel {
        uint8 color; 
        address painter;
    }

    struct Canvas {
        /**
        * Map of all pixels. 
        */
        mapping (uint32 => Pixel) pixels;

        /**
        * How many pixels has given address drawn. 
        */
        mapping (address => uint32) addressToCount;
        
        /**
        * Mapping that shows if address has been paid for its contribution for artwork.
        */
        mapping (address => bool) addressToIsPaid;
    }
}