pragma solidity 0.4.24;

import "./RewardableCanvas.sol";

/**
* @dev This contract takes care of initial bidding.
*/
contract BiddableCanvas is RewardableCanvas {

    uint public constant BIDDING_DURATION = 48 hours;

    mapping(uint32 => Bid) bids;
    mapping(address => uint32) addressToCount;

    uint public minimumBidAmount = 0.1 ether;

    event BidPosted(uint32 indexed canvasId, address indexed bidder, uint amount, uint finishTime);

    /**
    * Places bid for canvas that is in the state STATE_INITIAL_BIDDING.
    * If somebody is outbid his pending withdrawals will be to topped up.
    */
    function makeBid(uint32 _canvasId) external payable stateBidding(_canvasId) {
        Canvas storage canvas = _getCanvas(_canvasId);
        Bid storage oldBid = bids[_canvasId];

        if (msg.value < minimumBidAmount || msg.value <= oldBid.amount) {
            revert();
        }

        if (oldBid.bidder != 0x0 && oldBid.amount > 0) {
            //return old bidder his money
            addPendingWithdrawal(oldBid.bidder, oldBid.amount);
        }

        uint finishTime = canvas.initialBiddingFinishTime;
        if (finishTime == 0) {
            canvas.initialBiddingFinishTime = getTime() + BIDDING_DURATION;
        }

        bids[_canvasId] = Bid(msg.sender, msg.value);

        if (canvas.owner != 0x0) {
            addressToCount[canvas.owner]--;
        }
        canvas.owner = msg.sender;
        addressToCount[msg.sender]++;

        _registerBid(_canvasId, msg.value);

        emit BidPosted(_canvasId, msg.sender, msg.value, canvas.initialBiddingFinishTime);
    }

    /**
    * @notice   Returns last bid for canvas. If the initial bidding has been
    *           already finished that will be winning offer.
    */
    function getLastBidForCanvas(uint32 _canvasId) external view returns (
        uint32 canvasId,
        address bidder,
        uint amount,
        uint finishTime
    ) {
        Bid storage bid = bids[_canvasId];
        Canvas storage canvas = _getCanvas(_canvasId);

        return (_canvasId, bid.bidder, bid.amount, canvas.initialBiddingFinishTime);
    }

    /**
    * @notice   Returns number of canvases owned by the given address.
    */
    function balanceOf(address _owner) external view returns (uint) {
        return addressToCount[_owner];
    }

    /**
    * @notice   Only for the owner of the contract. Sets minimum bid amount.
    */
    function setMinimumBidAmount(uint _amount) external onlyOwner {
        minimumBidAmount = _amount;
    }

    struct Bid {
        address bidder;
        uint amount;
    }

}