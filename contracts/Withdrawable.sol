pragma solidity ^0.4.21;

/**
 * @dev Contract that holds pending withdrawals. Responsible for withdrawals.
 */
contract Withdrawable {

    mapping(address => uint) private pendingWithdrawals;

    event Withdrawal(address receiver, uint amount);
    event BalanceChanged(address _address, uint oldBalance, uint newBalance);

    /**
    * Returns amount of wei that given address is able to withdraw.
    */
    function toWithdraw(address _address) public view returns (uint) {
        return pendingWithdrawals[_address];
    }

    /**
    * Add pending withdrawal for an address.
    */
    function addPendingWithdrawal(address _address, uint _amount) internal {
        require(amount > 0);
        require(_address != 0x0);

        uint oldBalance = pendingWithdrawals[_address];
        pendingWithdrawals[_address] += _amount;

        BalanceChanged(_address, oldBalance, oldBalance + _amount);
    }

    /**
    * Withdraws all pending withdrawals.
    */
    function withdraw() external {
        uint amount = toWithdraw(msg.sender);
        require(amount > 0);

        pendingWithdrawals[msg.sender] = 0;
        msg.sender.transfer(amount);

        Withdrawal(msg.sender, amount);
        BalanceChanged(msg.sender, amount, 0);
    }

}
