pragma solidity 0.4.24;

import "./CanvasMarket.sol";

/**
* CryptoCanvas Terms of Use
*
* 1. Intro
*
* CryptoCanvas is a set of collectible artworks (“Canvas”) created by the CryptoCanvas community with proof of ownership stored on the Ethereum blockchain.
*
* This agreement does a few things. First, it passes copyright ownership of a Canvas from the Canvas Authors to the first Canvas Owner. The first Canvas Owner is then obligated to pass on the copyright ownership along with the Canvas to the next owner, and so on forever, such that each owner of a Canvas is also the copyright owner. Second, it requires each Canvas Owner to allow certain uses of their Canvas image. Third, it limits the rights of Canvas owners to sue The Mindhouse and the prior owners of the Canvas.
*
* Canvases of CryptoCanvas are not an investment. They are experimental digital art.
*
* PLEASE READ THESE TERMS CAREFULLY BEFORE USING THE APP, THE SMART CONTRACTS, OR THE SITE. BY USING THE APP, THE SMART CONTRACTS, THE SITE, OR ANY PART OF THEM YOU ARE CONFIRMING THAT YOU UNDERSTAND AND AGREE TO BE BOUND BY ALL OF THESE TERMS. IF YOU ARE ACCEPTING THESE TERMS ON BEHALF OF A COMPANY OR OTHER LEGAL ENTITY, YOU REPRESENT THAT YOU HAVE THE LEGAL AUTHORITY TO ACCEPT THESE TERMS ON THAT ENTITY’S BEHALF, IN WHICH CASE “YOU” WILL MEAN THAT ENTITY. IF YOU DO NOT HAVE SUCH AUTHORITY, OR IF YOU DO NOT ACCEPT ALL OF THESE TERMS, THEN WE ARE UNWILLING TO MAKE THE APP, THE SMART CONTRACTS, OR THE SITE AVAILABLE TO YOU. IF YOU DO NOT AGREE TO THESE TERMS, YOU MAY NOT ACCESS OR USE THE APP, THE SMART CONTRACTS, OR THE SITE.
*
* 2. Definitions
*
* “Smart Contract” refers to this smart contract.
*
* “Canvas” means a collectible artwork created by the CryptoCanvas community with information about the color and author of each pixel of the Canvas, and proof of ownership stored in the Smart Contract. The Canvas is considered finished when all the pixels of the Canvas have their color set. Specifically, the Canvas is considered finished when its “state” field in the Smart Contract equals to STATE_INITIAL_BIDDING or STATE_OWNED constant.
*
* “Canvas Author” means the person who painted at least one final pixel of the finished Canvas by sending a transaction to the Smart Contract. A person whose pixel has been painted over by another person loses rights to that pixel. Specifically, Canvas Author means the person with the private key for at least one address in the “painter” field of the “pixels” field of the applicable Canvas in the Smart Contract.
*
* “Canvas Owner” means the person that can cryptographically prove ownership of the applicable Canvas. Specifically, Canvas Owner means the person with the private key for the address in the “owner” field of the applicable Canvas in the Smart Contract. The person is the Canvas Owner only after the Initial Bidding phase is finished, that is when the field “state” of the applicable Canvas equals to the STATE_OWNED constant.
*
* “Initial Bidding” means the state of the Canvas when each of its pixels has been set by Canvas Authors but it does not have the Canvas Owner yet. In this phase any user can claim the ownership of the Canvas by sending a transaction to the Smart Contract (a “Bid”). Other users have 48 hours from the time of making the first Bid on the Canvas to submit their own Bids. After that time, the user who sent the highest Bid becomes the sole Canvas Owner of the applicable Canvas. Users who placed Bids with lower amounts are able to withdraw their Bid amount from their Account Balance.
*
* “Account Balance” means the value stored in the Smart Contract assigned to an address. The Account Balance can be withdrawn by the person with the private key for the applicable address by sending a transaction to the Smart Contract. Account Balance consists of Rewards for painting, Bids from Initial Bidding which have been overbid, cancelled offers to buy a Canvas and profits from selling a Canvas.
*
* “The Mindhouse”, “we” or “us” is the group of developers who created and published the CryptoCanvas Smart Contract.
*
* “The App” means collectively the Smart Contract and the website created by The Mindhouse to interact with the Smart Contract.
*
* 3. Intellectual Property
*
* A. First Assignment
* The Canvas Authors of the applicable Canvas hereby assign all copyright ownership in the Canvas to the Canvas Owner. In exchange for this copyright ownership, the Canvas Owner agrees to the terms below.
*
* B. Later Assignments
* When the Canvas Owner transfers the Canvas to a new owner, the Canvas Owner hereby agrees to assign all copyright ownership in the Canvas to the new owner of the Canvas. In exchange for these rights, the new owner shall agree to become the Canvas Owner, and shall agree to be subject to this Terms of Use.
*
* C. No Other Assignments.
* The Canvas Owner shall not assign or license the copyright except as set forth in the “Later Assignments” section above.
*
* D. Third Party Permissions.
* The Canvas Owner agrees to allow CryptoCanvas fans to make non-commercial Use of images of the Canvas to discuss CryptoCanvas, digital collectibles and related matters. “Use” means to reproduce, display, transmit, and distribute images of the Canvas. This permission excludes the right to print the Canvas onto physical copies (including, for example, shirts and posters).
*
* 4. Fees and Payment
*
* A. If you choose to paint, make a bid or trade any Canvas of CryptoCanvas any financial transactions that you engage in will be conducted solely through the Ethereum network via MetaMask. We will have no insight into or control over these payments or transactions, nor do we have the ability to reverse any transactions. With that in mind, we will have no liability to you or to any third party for any claims or damages that may arise as a result of any transactions that you engage in via the App, or using the Smart Contracts, or any other transactions that you conduct via the Ethereum network or MetaMask.
*
* B. Ethereum requires the payment of a transaction fee (a “Gas Fee”) for every transaction that occurs on the Ethereum network. The Gas Fee funds the network of computers that run the decentralized Ethereum network. This means that you will need to pay a Gas Fee for each transaction that occurs via the App.
*
* C. In addition to the Gas Fee, each time you sell a Canvas to another user of the App, you authorize us to collect a commission of 3.9% of the total value of that transaction (a “Commission”). You acknowledge and agree that the Commission will be transferred to us through the Ethereum network as part of the payment.
*
* D. If you are the Canvas Author you are eligible to receive a reward for painting a Canvas (a “Reward”) after the Initial Bidding phase is completed. You acknowledge and agree that the Reward for the Canvas Author will be calculated by dividing the value of the highest Bid decreased by our commision of 3.9% of the total value of the Bid, by the total number of pixels of the Canvas and multiplied by the number of pixels of the Canvas that have been painted by the applicable Canvas Author. You acknowledge and agree that in order to withdraw the Reward you first need to add the Reward to your Account Balance by sending a transaction to the Smart Contract.
*
* 5. Disclaimers
*
* A. YOU EXPRESSLY UNDERSTAND AND AGREE THAT YOUR ACCESS TO AND USE OF THE APP IS AT YOUR SOLE RISK, AND THAT THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMISSIBLE PURSUANT TO APPLICABLE LAW, WE, OUR SUBSIDIARIES, AFFILIATES, AND LICENSORS MAKE NO EXPRESS WARRANTIES AND HEREBY DISCLAIM ALL IMPLIED WARRANTIES REGARDING THE APP AND ANY PART OF IT (INCLUDING, WITHOUT LIMITATION, THE SITE, ANY SMART CONTRACT, OR ANY EXTERNAL WEBSITES), INCLUDING THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, CORRECTNESS, ACCURACY, OR RELIABILITY. WITHOUT LIMITING THE GENERALITY OF THE FOREGOING, WE, OUR SUBSIDIARIES, AFFILIATES, AND LICENSORS DO NOT REPRESENT OR WARRANT TO YOU THAT: (I) YOUR ACCESS TO OR USE OF THE APP WILL MEET YOUR REQUIREMENTS, (II) YOUR ACCESS TO OR USE OF THE APP WILL BE UNINTERRUPTED, TIMELY, SECURE OR FREE FROM ERROR, (III) USAGE DATA PROVIDED THROUGH THE APP WILL BE ACCURATE, (III) THE APP OR ANY CONTENT, SERVICES, OR FEATURES MADE AVAILABLE ON OR THROUGH THE APP ARE FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS, OR (IV) THAT ANY DATA THAT YOU DISCLOSE WHEN YOU USE THE APP WILL BE SECURE. SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OF IMPLIED WARRANTIES IN CONTRACTS WITH CONSUMERS, SO SOME OR ALL OF THE ABOVE EXCLUSIONS MAY NOT APPLY TO YOU.
*
* B. YOU ACCEPT THE INHERENT SECURITY RISKS OF PROVIDING INFORMATION AND DEALING ONLINE OVER THE INTERNET, AND AGREE THAT WE HAVE NO LIABILITY OR RESPONSIBILITY FOR ANY BREACH OF SECURITY UNLESS IT IS DUE TO OUR GROSS NEGLIGENCE.
*
* C. WE WILL NOT BE RESPONSIBLE OR LIABLE TO YOU FOR ANY LOSSES YOU INCUR AS THE RESULT OF YOUR USE OF THE ETHEREUM NETWORK OR THE METAMASK ELECTRONIC WALLET, INCLUDING BUT NOT LIMITED TO ANY LOSSES, DAMAGES OR CLAIMS ARISING FROM: (A) USER ERROR, SUCH AS FORGOTTEN PASSWORDS OR INCORRECTLY CONSTRUED SMART CONTRACTS OR OTHER TRANSACTIONS; (B) SERVER FAILURE OR DATA LOSS; (C) CORRUPTED WALLET FILES; (D) UNAUTHORIZED ACCESS OR ACTIVITIES BY THIRD PARTIES, INCLUDING BUT NOT LIMITED TO THE USE OF VIRUSES, PHISHING, BRUTEFORCING OR OTHER MEANS OF ATTACK AGAINST THE APP, ETHEREUM NETWORK, OR THE METAMASK ELECTRONIC WALLET.
*
* D. THE CANVASES OF CRYPTOCANVAS ARE INTANGIBLE DIGITAL ASSETS THAT EXIST ONLY BY VIRTUE OF THE OWNERSHIP RECORD MAINTAINED IN THE ETHEREUM NETWORK. ALL SMART CONTRACTS ARE CONDUCTED AND OCCUR ON THE DECENTRALIZED LEDGER WITHIN THE ETHEREUM PLATFORM. WE HAVE NO CONTROL OVER AND MAKE NO GUARANTEES OR PROMISES WITH RESPECT TO SMART CONTRACTS.
*
* E. THE MINDHOUSE IS NOT RESPONSIBLE FOR LOSSES DUE TO BLOCKCHAINS OR ANY OTHER FEATURES OF THE ETHEREUM NETWORK OR THE METAMASK ELECTRONIC WALLET, INCLUDING BUT NOT LIMITED TO LATE REPORT BY DEVELOPERS OR REPRESENTATIVES (OR NO REPORT AT ALL) OF ANY ISSUES WITH THE BLOCKCHAIN SUPPORTING THE ETHEREUM NETWORK, INCLUDING FORKS, TECHNICAL NODE ISSUES, OR ANY OTHER ISSUES HAVING FUND LOSSES AS A RESULT.
*
* 6. Limitation of Liability
* YOU UNDERSTAND AND AGREE THAT WE, OUR SUBSIDIARIES, AFFILIATES, AND LICENSORS WILL NOT BE LIABLE TO YOU OR TO ANY THIRD PARTY FOR ANY CONSEQUENTIAL, INCIDENTAL, INDIRECT, EXEMPLARY, SPECIAL, PUNITIVE, OR ENHANCED DAMAGES, OR FOR ANY LOSS OF ACTUAL OR ANTICIPATED PROFITS (REGARDLESS OF HOW THESE ARE CLASSIFIED AS DAMAGES), WHETHER ARISING OUT OF BREACH OF CONTRACT, TORT (INCLUDING NEGLIGENCE), OR OTHERWISE, REGARDLESS OF WHETHER SUCH DAMAGE WAS FORESEEABLE AND WHETHER EITHER PARTY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
*
*
* @dev Contract to be placed in blockchain. Contains utility methods. 
*/
contract CryptoArt is CanvasMarket {

    function getCanvasInfo(uint32 _canvasId) external view returns (
        uint32 id,
        string name,
        uint32 paintedPixels,
        uint8 canvasState,
        uint initialBiddingFinishTime,
        address owner
    ) {
        Canvas storage canvas = _getCanvas(_canvasId);

        return (_canvasId, canvas.name, canvas.paintedPixelsCount, getCanvasState(_canvasId),
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
    * @notice   Returns array of canvas's ids. Returned canvases have sell offer.
    *           If includePrivateOffers is true, includes offers that are targeted
    *           only to one specified address.
    */
    function getCanvasesWithSellOffer(bool includePrivateOffers) external view returns (uint32[]) {
        uint32[] memory result = new uint32[](canvases.length);
        uint currentIndex = 0;

        for (uint32 i = 0; i < canvases.length; i++) {
            SellOffer storage offer = canvasForSale[i];
            if (offer.isForSale && (includePrivateOffers || offer.onlySellTo == 0x0)) {
                result[currentIndex] = i;
                currentIndex++;
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