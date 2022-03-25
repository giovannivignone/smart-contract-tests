 const ASJ = artifacts.require("Astromojis")

contract("ASJ TEST", async accounts => {
    var contract;
    it("Should estabilsh first eth address as owner", async () => {
        const deployedASJ = await ASJ.deployed("ipfs://QmWUdmtZsRtbTbUYt8bV5ijLViDQx63LhCSBYzeK4hpsYX/");
        contract = deployedASJ;
        const owner = await deployedASJ.owner()
        assert.equal(owner, accounts[0])
    })
    it("Should return proper baseURI", async () => {
        const baseuri = await contract.BaseURI();
        assert.equal(baseuri, "ipfs://QmWUdmtZsRtbTbUYt8bV5ijLViDQx63LhCSBYzeK4hpsYX/")
    })
    it("Should return proper contractURI", async() => {
        const contractURI = await contract.contractURI()
        assert.equal(contractURI, 'ipfs://QmWUdmtZsRtbTbUYt8bV5ijLViDQx63LhCSBYzeK4hpsYX/contract.json')
    })

    // Below are tests for setMintPrice() and MintPrice var

    it("Should adjust the mint price to 0.5 eth", async() => {
        await contract.setMintPrice(web3.utils.toWei('0.5', 'ether'))
        const mintCost = await contract.MintPrice()
        assert.equal(mintCost,web3.utils.toWei('0.5', 'ether'))
        await contract.setMintPrice(web3.utils.toWei('0.0777', 'ether'))
    })
    it("Should not allow other than owner to change mintcost", async() => {
        try {
            await contract.setMintPrice(web3.utils.toWei('0.5', 'ether'), {from: accounts[3]})
            throw new Error("***ERROR*** You should have failed to mint here");
        } catch (error) {
            const errmsg = error.message.split(":")[3]
            assert.equal(errmsg, " caller is not the owner -- Reason given")
        }
    })

    // Below are addToWhitelist() and OnWhiteList() tests

    it("Should add user to whitelist", async() => {
        await contract.addToWhitelist([accounts[2], accounts[3]],true)
        const onWL = await contract.OnWhiteList(accounts[2]);
        assert.equal(onWL,true)
    })
    it("Should remove user from WL", async() => {
        await contract.addToWhitelist([accounts[2]], false);
        const onWL = await contract.OnWhiteList(accounts[2]);
        assert.equal(onWL, false);
    })

    // Below are testing mintWhiteList(), pauseWhiteList() and token allocation (CONTINUED ON LINE 175)

    it("Should not allow WLed User to mint bc WL is off", async() => {
        try {
            await contract.mintWhiteList(1, {from: accounts[3], value: web3.utils.toWei('0.0555', 'ether')})
            throw new Error("***ERROR*** This should be failing")
        } catch (error) {
            const errmsg = error.message.split(":")[3]
            assert.equal(errmsg, " Whitelist is not active.")
            await contract.pauseWhitelist()
            const contractStateWL = await contract.WhiteListActive()
            assert.equal(contractStateWL, true)
        }
    })
    /* @dev below is the first mint of the test contract */
    it("Should allow user to only mint from WL for 0.0555", async() => {
        try{
            await contract.mintWhiteList(1, {from: accounts[3], value: web3.utils.toWei('0.0554', 'ether')})
            throw new Error("***ERROR*** This should be failing")
        } catch (error) {
            const errmsg = error.message.split(":")[3]
            assert.equal(errmsg, " Incorrect value sent.")
            await contract.mintWhiteList(1, {from: accounts[3], value: web3.utils.toWei('0.0555', 'ether')})
            const bal3 = await contract.balanceOf(accounts[3])
            assert.equal(bal3, 1)
        }
    })
    it("Should have minted tokenID 1 first and not token 0", async() => {
        const firstTokenHolder = await contract.ownerOf(1)
        assert.equal(firstTokenHolder, accounts[3])
        try{
            const unHeldToken = await contract.ownerOf(0)
            throw new Error("***ERROR*** This should be failing")
        } catch (error) {
            const errmsg = error.message.split(":")[3]
            assert.equal(errmsg, ' owner query for nonexistent token')
        }
    })
    it("Should have TokenURI of 1 return baseURI + id", async() => {
        const tokenURI = await contract.tokenURI(1)
        const bURI = await contract.BaseURI()
        assert.equal(tokenURI,bURI + 1)
    })
    it("Should allow a user to mint only 20 tokens per tx on WL and increase totalSupply by 20", async() => {
        try{
            await contract.mintWhiteList(21, {from: accounts[3], value: web3.utils.toWei('1.1655', 'ether')})
            throw new Error("***ERROR*** This should be failing") 
        } catch(error) {
            const errmsg = error.message.split(":")[3]
            assert.equal(errmsg, " You can only mint 20 tokens at a time.")
            const totalMinted = await contract.totalSupply();
            await contract.mintWhiteList(20, {from: accounts[3], value: web3.utils.toWei('1.11', 'ether')})
            const newTotalMinted = await contract.totalSupply();
            const bal3 = await contract.balanceOf(accounts[3])
            assert.equal(bal3, 21)
            assert.equal(Number(totalMinted)+20, newTotalMinted)
        }
    })
    it("Should have minted 21 tokenIDs", async() => {
        const buri = await contract.BaseURI()
        for (var i = 1; i<22; i++){
            const str = await contract.tokenURI(i)  /* @dev this will throw non-existant query error if missing tokens*/
            assert.equal(str, buri + i)
        }
    })

    //Reserve() testing

    it("Should not allow non-owners to reserve", async() => {
        try{
            await contract.reserve(1, accounts[3], {from: accounts[3]})
            throw new Error("***ERROR*** This should be failing")
        } catch(error) {
            const errmsg = error.message.split(":")[3]
            assert.equal(errmsg, " caller is not the owner -- Reason given")
        }
    })

    it("Should increase our balance by 500", async() => {
        const currBal = await contract.balanceOf(accounts[0])
        for(var i = 0; i < 10; i++){
            await contract.reserve(50, accounts[0])
        }
        const newBal = await contract.balanceOf(accounts[0])
        assert.equal(Number(currBal)+500, newBal)
    })

    //Below are adjustWhiteListSupply() and WhiteListSupply var tests

    it("Should only allow owner to reduce Whitelist supply", async() => {
        try{
            await contract.adjustWhiteListSupply(100, {from: accounts[1]})
            throw new Error("***ERROR*** This should be failing") 
        } catch(error){
            const errmsg = error.message.split(":")[3]
            assert.equal(errmsg, " caller is not the owner -- Reason given")
        }
    })
    it("Should reduce whitelist supply from 3704 to 100", async() => {
        const oldWLSupply = await contract.WhiteListSupply()
        await contract.adjustWhiteListSupply(100)
        const whitelistSupply = await contract.WhiteListSupply()
        assert.equal(Number(oldWLSupply)-3233, whitelistSupply)
    })

    //Below are setWhiteListMintPrice() and WhiteListMintPrice var tests

    it("Should set whitelist mintprice to 0.01 ether", async()=> {
        await contract.setWhiteListMintPrice(web3.utils.toWei('0.01', 'ether'))
        const WLMintCost = await contract.WhiteListMintPrice()
        assert.equal(web3.utils.toWei('0.01', 'ether'), WLMintCost)
    })
    it("Should not be able to adjust WL mint cost if not owner", async()=> {
        try{
            await contract.setWhiteListMintPrice(web3.utils.toWei('1000', 'ether'), {from: accounts[2]})
            throw new Error("***ERROR*** This should be failing");
        } catch(error) {
            const errmsg = error.message.split(":")[3]
            assert.equal(errmsg, " caller is not the owner -- Reason given")
        }
    })
    
    //Below are both pause(), pauseWhiteList(), WhiteListActive() var tests
    it("Should fail to pause contract bc caller isn't owner", async () => {
        try {
            await contract.pause({from: accounts[1]});
            throw new Error("***ERROR*** You should have failed to pause here");
        } catch (error) {
            const errmsg = error.message.split(":")[3]
            assert.equal(errmsg, " caller is not the owner -- Reason given")
        }
    })
    it("Should pause and unpause the WhiteList", async() => {
        const currWLState = await contract.WhiteListActive()
        await contract.pauseWhitelist()
        const newWLState = await contract.WhiteListActive()
        assert.equal(!Boolean(currWLState), newWLState)
    })
    it("Should pause the publicSale", async() => {
        const pubSaleState = await contract.SaleActive()
        await contract.pause()
        const newpubSaleState = await contract.SaleActive()
        assert.equal(!Boolean(pubSaleState), newpubSaleState)
    })

    //Below are CONTINUED WhiteListMint() tests -- mintout (100 seconds) */

    it("Should mint out whitelist supply of 3704 after resetting WLMintCap and dropping mint price", async() => {
        await contract.adjustWhiteListSupply(3704);
        await contract.setWhiteListMintPrice(web3.utils.toWei('0.001','ether'));
        await contract.pauseWhitelist()
        const totalMinted = await contract.totalSupply()
        await contract.addToWhitelist(accounts,true);
        const iterations = Math.floor((3704-totalMinted)/20)
        for (var i = 0; i < iterations; i++) {
            var acctToUse = Math.floor(Math.random()*10)
            await contract.mintWhiteList(20,{from: accounts[acctToUse], value: web3.utils.toWei('0.02','ether')})
        }
        await contract.mintWhiteList(3,{value: web3.utils.toWei('0.003','ether')})
        try{
            await contract.mintWhiteList(1,{value: web3.utils.toWei('0.001','ether')})
            throw new Error("***ERROR*** You should have failed to pause here");
        } catch (error) {
            const errmsg = error.message.split(":")[3]
            assert.equal(errmsg, " Whitelist minted out.")
            /* @dev in the above error, we should exeed the supply for 3704 to 3705*/
            const minted = await contract.totalSupply()
            assert.equal(minted, 3704)
        }
        await contract.pauseWhitelist()
        assert.equal()
    })


    //Below is testing withdraw()
    it("Should not allow non-owner to withdraw", async() => {
        try{
            await contract.withdraw({from:accounts[1]});
            throw new Error("***ERROR*** You should have failed to pause here");
        } catch (error) {
            const errmsg = error.message.split(":")[3]
            assert.equal(errmsg, " caller is not the owner -- Reason given")
        }
    })
    it("Should increase owner balance", async() => {
        const bal = await web3.eth.getBalance(accounts[0])
        await contract.withdraw()
        const newbal = await web3.eth.getBalance(accounts[0])
        assert.equal(true, Number(newbal)>Number(bal))
    })

    //Below are mint() tests

    it("Should fail to mint bc paused", async () => {
        try {
            await contract.pause()
            await contract.mint(1, {value: web3.utils.toWei('0.0777', 'ether')});
            throw new Error("***ERROR*** You should have failed to mint here");
        } catch (error) {
            const errmsg = error.message.split(":")[3]
            assert.equal(errmsg, " Sale not active.")
        }
    })
    it("Should fail bc msg.value is below mint", async () => {
        try {
            await contract.pause();
            await contract.mint(1, {value: web3.utils.toWei('0.0776', 'ether')});
            throw new Error("***ERROR*** You should have failed to mint here");
        } catch (error) {
            const errmsg = error.message.split(":")[3]
            assert.equal(errmsg, " Incorrect value sent.")
        }
    })
    it("Should fail mint at 0.4999 eth due to new set price", async() => {
        try{
            await contract.setMintPrice(web3.utils.toWei('0.5', 'ether'));
            await contract.mint(1, {value: web3.utils.toWei('0.4999', 'ether'), from: accounts[1]});
            throw new Error("***ERROR*** You should have failed to mint here");
        } catch(error){
            const errmsg = error.message.split(":")[3]
            assert.equal(errmsg, " Incorrect value sent.")
        }
    })
    it("Should fail mint bc over 20 token/mint limit", async() => {
        try{
            await contract.setMintPrice(web3.utils.toWei('0.0777', 'ether'))
            await contract.mint(21, {value: web3.utils.toWei('1.6317', 'ether')})
            throw new Error("***ERROR*** You should have failed to mint here");
        }catch (error){
            const errmsg = error.message.split(":")[3]
            assert.equal(errmsg, " Limited to 20 tokens per tx.")
        }
    })
    it("Should increase my balance and token mint by 5 if I mint 5 tokens", async () => {
        const oldBal = await contract.balanceOf(accounts[7]);
        const oldSupply = await contract.totalSupply();
        await contract.mint(5,{value: web3.utils.toWei('0.3885', 'ether'), from: accounts[7]})
        const newSupply = await contract.totalSupply();
        const newBal = await contract.balanceOf(accounts[7])
        assert.equal(Number(oldSupply)+5, newSupply);
        assert.equal(Number(oldBal)+5, newBal);
    })
    /* BELOW TEST MINTS OUT ALL TOKENS to 4445, making our tokenids 1-4445 (200 seconds) */
    it("Should mint out remaining tokens on 0.00001 eth mint adjusted cost", async() => {
        const totalMinted = await contract.totalSupply()
        console.log(totalMinted)
        const iterations = Math.floor((4445-totalMinted)/20)
        await contract.setMintPrice(web3.utils.toWei('0.00001','ether'))
        for (var i = 0; i < iterations; i++) {
            var acctToUse = Math.floor(Math.random()*10)
            await contract.mint(20,{from: accounts[acctToUse], value: web3.utils.toWei('0.0002','ether')})
        }
        await contract.mint(16, {value: web3.utils.toWei('0.00016', 'ether')})
        try{
            await contract.mint(1,{value: web3.utils.toWei('0.00001','ether')})
            throw new Error("***ERROR*** You should have failed to pause here");
        } catch (error) {
            const errmsg = error.message.split(":")[3]
            assert.equal(errmsg, " Sold out.")
            /* @dev in the above error, we should exeed the supply for 3704 to 3705*/
            const minted = await contract.totalSupply()
            assert.equal(minted, 4445)
        }
    })

    //BELOW checks all tokens minted (230+ seconds)
    
    it("Should query all tokens to ensure no unminted tokens and check 4446", async() => {
        for (var i = 1; i < 4446; i++){
            await contract.tokenURI(i)
        }
        assert.equal(0,0)
        try{
            await contract.tokenURI(4446)
            throw new Error("***ERROR*** The above should have failed");
        } catch(error){
            const errmsg = error.message.split(":")[3]
            assert.equal(errmsg, ' URI query for nonexistent token')
        }
    })

    //Below tests withdraw after mintout

    it("Should increase owner balance", async() => {
        const bal = await web3.eth.getBalance(accounts[0])
        await contract.withdraw()
        const newbal = await web3.eth.getBalance(accounts[0])
        assert.equal(true, Number(newbal)>Number(bal))
    })


    //Below is making sure mint functions dont work after supply is minted out

    it("Should block reserve after supply minted", async() => {
        const currBal = await contract.balanceOf(accounts[0])
        try{
            await contract.reserve(1, accounts[0])
            throw new Error("***ERROR*** You should have failed to pause here");
        }catch (error){
            const errmsg = error.message.split(":")[3]
            assert.equal(errmsg, " Supply minted out.")
        }
    })

    // Below tests supplyLocked, metadataFrozen,lockSupply() and setBaseURI()

    it("Should allow a change of the baseURI only before freezeMeta() called and not after", async() =>{
        const bURI = await contract.BaseURI()
        await contract.setBaseURI('ipfs://QmWUdmtZsRtbTbUYt8bV5ijLViDQx63LhCSBYzeK4hpsYX/');
        const newbURI = await contract.BaseURI();
        assert.equal(newbURI,'ipfs://QmWUdmtZsRtbTbUYt8bV5ijLViDQx63LhCSBYzeK4hpsYX/')
        assert.equal(true, newbURI == 'ipfs://QmWUdmtZsRtbTbUYt8bV5ijLViDQx63LhCSBYzeK4hpsYX/')
        await contract.freezeMetadata()
        await contract.freezeMetadata()
        try{
            await contract.setBaseURI('ipfs://QmWUdmtZsRtbTbUYt8bV5ijLViDQx63LhCSBYzeK4hpsYX/');
            throw new Error("***ERROR*** You should have failed to pause here");
        }catch (error){
            const errmsg = error.message.split(":")[3]
            assert.equal(errmsg, " Metadata has been locked and permenantly decentralized.")
        }
    })
    it("Should lock up supply and not allow adjustments on normal supply", async() => {
        await contract.lockSupply();
        try{
            await contract.adjustSupply(100000);
            throw new Error("***ERROR*** You should have failed to pause here");
        }catch (error){
            const errmsg = error.message.split(":")[3]
            assert.equal(errmsg, " Supply has been permanently locked.")
        }
    })
    it("Should lock up supply and not allow adjustments on WL supply", async() => {
        await contract.lockSupply();
        try{
            await contract.adjustWhiteListSupply(100000);
            throw new Error("***ERROR*** You should have failed to pause here");
        }catch (error){
            const errmsg = error.message.split(":")[3]
            assert.equal(errmsg, " Supply has been permanently locked.")
        }
    })  
})





// Below is reserve() testing if we reserve before opening whitelist

const ASJ2 = artifacts.require("Astromojis")
contract("ASJ TEST2", async accounts => {
    var contract2;
    it("Should allow us to reserve before whitelist mint and mint tokenids 1-500", async () => {
        const deployedASJ = await ASJ2.deployed("ipfs://QmWUdmtZsRtbTbUYt8bV5ijLViDQx63LhCSBYzeK4hpsYX/");
        contract2 = deployedASJ;
        const intialSupply = await contract2.totalSupply()
        await contract2.pauseWhitelist()
        for(var i = 0; i < 10; i++){
            await contract2.reserve(50, accounts[0])
        }
        const newSupply = await contract2.totalSupply()
        assert.equal(Number(intialSupply)+500, newSupply)
    })
    it("Should have tokenIDs 1-500 minted", async() => {
        const buri = await contract2.BaseURI()
        for (var i = 1; i<=500; i++){
            const str = await contract2.tokenURI(i)  /* @dev this will throw non-existant query error if missing tokens*/
            assert.equal(str, buri + i)
        }
    })
    it("Should mint tokenID 501 on whitelist", async() => {
        await contract2.addToWhitelist([accounts[1]],true)
        const totalSupply = await contract2.totalSupply()
        await contract2.tokenURI(500)
        try{
            await contract2.tokenURI(501)
            throw new Error("***ERROR*** The above should have failed");
        } catch(error){
            const errmsg = error.message.split(":")[3]
            assert.equal(errmsg, ' URI query for nonexistent token')
        }
        await contract2.mintWhiteList(1,{ from: accounts[1], value: web3.utils.toWei('0.0555','ether')})
        const newSupply = await contract2.totalSupply();
        const tokenURI501 = await contract2.tokenURI(501)
        assert.equal(tokenURI501, await contract2.BaseURI() + 501);
        assert.equal(Number(totalSupply) + 1, newSupply)
    })
})