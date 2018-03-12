pragma solidity 0.4.21;

import './CanvasFactory.sol';

/**
* @dev This contract takes care of innitial bidding. 
*/
contract BiddableCanvas is CanvasFactory {

    //@dev It means artwork is not finished yet, and bidding is not possible. 
    uint8 public constant BIDDING_ARTWORK_NOT_FINISHED = 0;

    //@dev  there is ongoing bidding and anybody can bid. If there artwork can have 
    //      assigned owner, but it can change if someone will over-bid him. 
    uint8 public constant BIDDING_ONGOING = 1;

    //@dev artwork has been sold, and bidding is not possible. 
    uint8 public constant BIDDING_SOLD = 2;

    uint public constant COMMISSION = 20; // 1 / 20 is our commision on every transaction 
    uint public constant MINIMUM_BID_AMOUNT = 0.08 ether;
    uint public constant BIDDING_DURATION = 48 hours;

    mapping (uint32 => Bid) bids;

    event BidPosted(address _bidder, uint _amount, uint _finishTime);
    event MoneyPaid(address _address, uint _amount);
    event CommissionPaid(uint _amount);

    modifier biddingPossible(uint32 _artworkId) {
        require(getArtworkBiddingState(_artworkId) == BIDDING_ONGOING);
        _;
    }

    modifier biddingFinished(uint32 _artworkId) {
        require(getArtworkBiddingState(_artworkId) == BIDDING_SOLD);
        _;
    }

    function makeBid(uint32 _artworkId) public payable biddingPossible(_artworkId) {
        Canvas storage canvas = _getCanvas(_artworkId);
        Bid storage oldBid = bids[_artworkId]; 

        if (msg.value < MINIMUM_BID_AMOUNT || msg.value <= oldBid.amount) {
            revert();
        }

        //TODO handle our commission. We can't add it to commssion, as it should be 
        //blocked until bidding finishes... 

        if (oldBid.bidder != 0x0 && oldBid.amount > 0) {
            //return old bidder his money
            oldBid.bidder.transfer(oldBid.amount);
        }

        uint finishTime = oldBid.finishTime;
        if (finishTime == 0) {
            finishTime = now + BIDDING_DURATION;
        }

        Bid memory currentBid = Bid(msg.sender, msg.value, finishTime, false);
        bids[_artworkId] = currentBid;
        canvas.owner = msg.sender;

        BidPosted(currentBid.bidder, currentBid.amount, currentBid.finishTime);
    }

    function getLastBidForArtwork(uint32 _artworkId) public view returns(address, uint, uint) {
        Bid storage bid = bids[_artworkId];
        return (bid.bidder, bid.amount, bid.finishTime);
    }

    function getArtworkBiddingState(uint32 _artworkId) public view returns(uint8) {
        Canvas storage canvas = _getCanvas(_artworkId);

        if (_isArtworkFinished(canvas)) { 
            uint finishTime = bids[_artworkId].finishTime;
            if (finishTime == 0 || finishTime > now) {
                return BIDDING_ONGOING;

            } else {
                return BIDDING_SOLD;
            }
            
        } else {
            return BIDDING_ARTWORK_NOT_FINISHED;
        }
    }

    function withdrawReward(uint32 _artworkId) public biddingFinished(_artworkId) {
        Bid storage bid = bids[_artworkId];
        require(bid.amount > 0); //make sure bid was really made, and there is money to distribute 
        require(!bid.isAddressPaid[msg.sender]);

        uint32 paintedPixels = _countPaintedPixels(msg.sender, _artworkId);
        require(paintedPixels > 0); //make sure calling address actually painted something

        uint pricePerPixel = _calculatePricePerPixel(bid.amount);
        uint toWithdraw = paintedPixels * pricePerPixel; 

        bid.isAddressPaid[msg.sender] = true;
        msg.sender.transfer(toWithdraw);

        MoneyPaid(msg.sender, toWithdraw);
    }

    function withdrawCommission(uint32 _artworkId) public onlyOwner biddingFinished(_artworkId) {
        Bid storage bid = bids[_artworkId];
        require(bid.amount > 0); //make sure bid was really made, and there is money to distribute 
        require(!bid.isCommisionPaid);

        uint commission = _calculateCommission(bid.amount);
        bid.isCommisionPaid = true;
        owner.transfer(commission);

        CommissionPaid(commission);
    }

    function _calculatePricePerPixel(uint _totalPrice) private pure returns(uint) {
        return (_totalPrice - _calculateCommission(_totalPrice)) / PIXEL_COUNT;
    }

    function _calculateCommission(uint _totalPrice) private pure returns(uint) {
        return _totalPrice / COMMISSION;
    }

    struct Bid {
        address bidder;
        uint amount; 

        /**
        * Before that time someone else still can over-bid canvas. After that time it means that 
        * canvas has been sold, and it's up to it's owner to sell it or not. 
        */
        uint finishTime; 

        bool isCommisionPaid;

        /**
        * @dev holds info if an address has been paid for each painted pixel. 
        */
        mapping (address => bool) isAddressPaid;
    }

}