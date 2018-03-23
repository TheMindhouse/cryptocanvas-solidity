pragma solidity 0.4.21;

import "./CanvasFactory.sol";

/**
* @dev This contract takes care of innitial bidding. 
*/
contract BiddableCanvas is CanvasFactory {

    //@dev It means artwork is not finished yet, and bidding is not possible. 
    uint8 public constant STATE_NOT_FINISHED = 0;

    //@dev  there is ongoing bidding and anybody can bid. If there artwork can have 
    //      assigned owner, but it can change if someone will over-bid him. 
    uint8 public constant STATE_INITIAL_BIDDING = 1;

    //@dev artwork has been sold, and has the owner
    uint8 public constant STATE_OWNED = 2;

    uint public constant COMMISSION = 20; // 1 / 20 is our commission on every transaction
    uint public constant MINIMUM_BID_AMOUNT = 0.08 ether;
    uint public constant BIDDING_DURATION = 48 hours;

    mapping(uint32 => Bid) bids;
    mapping(address => uint32) addressToCount;

    event BidPosted(address _bidder, uint _amount, uint _finishTime);
    event MoneyPaid(address _address, uint _amount);
    event CommissionPaid(uint _amount);

    modifier stateBidding(uint32 _canvasId) {
        require(getCanvasState(_canvasId) == STATE_INITIAL_BIDDING);
        _;
    }

    modifier stateOwned(uint32 _canvasId) {
        require(getCanvasState(_canvasId) == STATE_OWNED);
        _;
    }

    function makeBid(uint32 _canvasId) public payable stateBidding(_canvasId) {
        Canvas storage canvas = _getCanvas(_canvasId);
        Bid storage oldBid = bids[_canvasId];

        if (msg.value < MINIMUM_BID_AMOUNT || msg.value <= oldBid.amount) {
            revert();
        }

        if (oldBid.bidder != 0x0 && oldBid.amount > 0) {
            //return old bidder his money
            oldBid.bidder.transfer(oldBid.amount);
        }

        uint finishTime = oldBid.finishTime;
        if (finishTime == 0) {
            finishTime = now + BIDDING_DURATION;
        }

        Bid memory currentBid = Bid(msg.sender, msg.value, finishTime, false);
        bids[_canvasId] = currentBid;

        if (canvas.owner != 0x0) {
            addressToCount[canvas.owner]--;
        }
        canvas.owner = msg.sender;
        addressToCount[msg.sender]++;

        BidPosted(currentBid.bidder, currentBid.amount, currentBid.finishTime);
    }

    function getLastBidForCavas(uint32 _canvasId) public view returns (address bidder, uint amount, uint finishTime) {
        Bid storage bid = bids[_canvasId];
        return (bid.bidder, bid.amount, bid.finishTime);
    }

    function getCanvasState(uint32 _canvasId) public view returns (uint8) {
        Canvas storage canvas = _getCanvas(_canvasId);

        if (_isArtworkFinished(canvas)) {
            uint finishTime = bids[_canvasId].finishTime;
            if (finishTime == 0 || finishTime > now) {
                return STATE_INITIAL_BIDDING;

            } else {
                return STATE_OWNED;
            }

        } else {
            return STATE_NOT_FINISHED;
        }
    }

    function calculateReward(uint32 _canvasId, address _address) public view stateOwned(_canvasId) returns (uint32 pixelsCount, uint reward, bool isPaid) {
        Bid storage bid = bids[_canvasId];
        uint32 paintedPixels = _countPaintedPixels(_address, _canvasId);
        uint pricePerPixel = _calculatePricePerPixel(bid.amount);
        uint reward = paintedPixels * pricePerPixel;

        return (paintedPixels, reward, bid.isAddressPaid[_address]);
    }

    function withdrawReward(uint32 _canvasId) public stateOwned(_canvasId) {
        Bid storage bid = bids[_canvasId];

        var (pixelCount, reward, isPaid) = calculateReward(_canvasId, msg.caller);
        require(pixelCount > 0);
        require(reward > 0);
        require(!isPaid);

        bid.isAddressPaid[msg.sender] = true;
        msg.sender.transfer(toWithdraw);

        MoneyPaid(msg.sender, toWithdraw);
    }

    function calculateCommision(uint32 _canvasId) public stateOwned(_canvasId) returns (uint comission, bool isPaid) {
        Bid storage bid = bids[_canvasId];
        return (_calculateCommission(bid.amount), bid.isCommissionPaid);
    }

    function withdrawCommission(uint32 _canvasId) public onlyOwner stateOwned(_canvasId) {
        Bid storage bid = bids[_canvasId];
        var (comission, isPaid) = calculateComission(_canvasId);

        require(comission > 0);
        require(!isPaid);

        bid.isCommissionPaid = true;
        owner.transfer(commission);

        CommissionPaid(commission);
    }

    function balanceOf(address _owner) external returns (uint) {
        return addressToCount[_owner];
    }

    function _calculatePricePerPixel(uint _totalPrice) private pure returns (uint) {
        return (_totalPrice - _calculateCommission(_totalPrice)) / PIXEL_COUNT;
    }

    function _calculateCommission(uint _totalPrice) private pure returns (uint) {
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

        bool isCommissionPaid;

        /**
        * @dev holds info if an address has been paid for each painted pixel. 
        */
        mapping(address => bool) isAddressPaid;
    }

}