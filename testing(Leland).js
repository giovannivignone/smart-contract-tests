const { expect } = require("chai");
const { ethers, web3 } = require("hardhat");

const CW = artifacts.require("LelandNFTs")

const batchSize = 1200
const metadata = "ipfs://QmWUdmtZsRtbTbUYt8bV5ijLViDQx63LhCSBYzeK4hpsYX/"
const exclusive = "exclusive.json"

contract("LelandNFTs testing #1", async accounts => {
    var contract;
    it("Should estabilsh first eth address as owner", async () => {
      const inputWei = web3.utils.toWei('0.044', 'ether')
        const deployedASJ = await CW.new(metadata, exclusive, inputWei);
        contract = deployedASJ;
        const owner = await deployedASJ.owner()
        assert.equal(owner, accounts[0])
    })

    // Testing BaseURI()

    it("Should return proper baseURI", async () => {
        const baseuri = await contract.BaseURI();
        assert.equal(baseuri, "ipfs://QmWUdmtZsRtbTbUYt8bV5ijLViDQx63LhCSBYzeK4hpsYX/")
    })

    // Testing ContractURI()

    it("Should return proper contractURI", async() => {
        const contractURI = await contract.contractURI()
        assert.equal(contractURI, metadata + 'contract.json')
    })

    // Testing SalePaused Variable and pause()
    
    it("Should throw error because non-Owner trys to unpause", async() => {
      try {
          await contract.pause({from: accounts[1]});
          throw new Error("***ERROR*** You should have failed to pause here");
      } catch (error) {
          const errmsg = error.message.split(":")[2]
          assert.equal(errmsg, " caller is not the owner'")
      }
    })

    it("Contract should initially be paused", async()=> {
      const paused = await contract.SalePaused()
      assert.equal(true, paused)
    } )

    // Below are tests for changePrice() and MintCost var

    it("Should adjust the mint price to 0.5 eth", async() => {
        await contract.changePrice(web3.utils.toWei('0.5', 'ether'))
        const mintCost = await contract.MintCost()
        assert.equal(mintCost,web3.utils.toWei('0.5', 'ether'))
        await contract.changePrice(web3.utils.toWei('0.044', 'ether'))
    })

    it("Should not allow other than owner to change mintcost", async() => {
        try {
            await contract.changePrice(web3.utils.toWei('0.5', 'ether'), {from: accounts[3]})
            throw new Error("***ERROR*** You should have failed to mint here");
        } catch (error) {
            const errmsg = error.message.split(":")[2]
            assert.equal(errmsg, " caller is not the owner'")
        }
    })

    // Testing MintNFT()

    it("Should error on mint because paused", async() => {
      try {
        await contract.mintNFT({from:accounts[0], value: web3.utils.toWei('0.044', 'ether')})
        throw new Error("***ERROR*** You should have failed to pause here");
      } catch (error) {
          const errmsg = error.message.split(":")[1]
          assert.equal(errmsg, " reverted with reason string 'Sale not active'")
      }
    })

//     /* @dev below is the first mint of the test contract */

    it("Should fail to mint when msg.value < MintCost and test should adjust Cost and mint at that cost", async() => {
      await contract.changePrice(web3.utils.toWei('0.005', 'ether'))
      const mintCost = await contract.MintCost()
      assert.equal(mintCost,web3.utils.toWei('0.005', 'ether'))
      await contract.pause()
      try{
            await contract.mintNFT({from: accounts[3], value: web3.utils.toWei('0.00499', 'ether')})
            throw new Error("***ERROR*** This should be failing")
        } catch (error) {
            const errmsg = error.message.split("string")[1]
            assert.equal(errmsg, " 'Incorrect value sent'")
            await contract.mintNFT({from: accounts[3], value: web3.utils.toWei('0.005', 'ether')})
            const bal3 = await contract.balanceOf(accounts[3])
            assert.equal(bal3, 12)
        }
      await contract.changePrice(web3.utils.toWei('0.044', 'ether'))
  })

  it("Should Mint up to 120 NFTs and fail after", async()=>{
    const totalSupy = await contract.totalSupply()
    await contract.adjustSupply(120)
    for (var i = 0; i <9; i++){
      await contract.mintNFT({from: accounts[3], value: web3.utils.toWei('0.044', 'ether')})
    }
    const totalSup = await contract.totalSupply()
    assert.equal(totalSup, 120)
    try{
      await contract.reserve(1, accounts[0])
      throw new Error("***ERROR*** This should be failing")
        } catch (error) {
          const errmsg = error.message.split("string")[1]
          assert.equal(errmsg, " 'Quantity exceeds supply'")
          await contract.adjustSupply(10000000)
        }
    
  })

  // Testing reserve() Below

  it("Should not let non owners reserve()", async()=>{
    try{
      await contract.reserve(1, accounts[0], {from:accounts[1]})
      throw new Error("***ERROR*** This should be failing")
      } catch (error) {
        const errmsg = error.message.split("string")[1]
        assert.equal(errmsg, " 'Ownable: caller is not the owner'")
      }
  })

  it("Should not let us mint over batchsize", async()=>{
    try{
      await contract.reserve(batchSize+1, accounts[1])
      throw new Error("***ERROR*** This should be failing")
      } catch (error) {
        const errmsg = error.message.split("string")[1]
        assert.equal(errmsg, " 'Only mint up to batchsize'")
      }
  })

  it("Should reserve up to batchsize", async()=>{
    const ts = await contract.totalSupply()
    await contract.reserve(batchSize, accounts[1])
    const newTs = await contract.totalSupply()
    assert.equal(Number(ts) + Number(batchSize), newTs)
  })

  // Testing airDropSingleBatches()

  it("Should airdrop 12 NFTs to adr4, adr5", async()=>{
    const bal4 = await contract.balanceOf(accounts[4])
    const bal5 = await contract.balanceOf(accounts[5])
    await contract.airDropSingleBatches([accounts[4],accounts[5]])
    const bal4n = await contract.balanceOf(accounts[4])
    const bal5n = await contract.balanceOf(accounts[5])
    assert.equal(Number(bal4)+ 12, bal4n)
    assert.equal(Number(bal5)+ 12, bal5n)
  })

  it("Should restrict airdrop if Supply too low", async()=>{
    const oldSup = await contract.Supply()
    const currSupply = await contract.totalSupply()
    await contract.adjustSupply(Number(currSupply)+ 23)
    try{ 
      await contract.airDropSingleBatches([accounts[4],accounts[5]])
      throw new Error("***ERROR*** This should be failing")
      } catch (error) {
        const errmsg = error.message.split("string")[1]
        assert.equal(errmsg, " 'Quantity exceeds supply'")
      }
    await contract.adjustSupply(oldSup)
  })


  // Testing airDrop()

  it("Should airdrop setBatch amount to adr1", async()=>{
    const bal1 = Number(await contract.balanceOf(accounts[1]))
    await contract.airDrop([accounts[1]], [10])
    const bal1post = Number(await contract.balanceOf(accounts[1]))
    assert.equal(bal1 + 120, bal1post)
  })

  it("Should error on minting above batchzie", async()=>{
    const bal0 = Number(await contract.balanceOf(accounts[0]))
    try{
      await contract.airDrop([accounts[0],accounts[1]],[1,(batchSize/12)+1])
      throw new Error("***ERROR*** This should be failing")
    } catch(error){
      const errmsg = error.message.split("string")[1]
      assert.equal(errmsg, " 'Only mint up to batchsize'")
    }
    const bal0post = Number(await contract.balanceOf(accounts[0]))
    assert.equal(bal0, bal0post)
  })

  // Testing mintExclusive() and tokenURI()

  it("Should mint an exclusive NFT with a different tokenID", async()=>{
    const nextToken = Number(await contract.totalSupply())
    const sup = Number(await contract.totalSupply())
    const lastToken = Number(await contract.totalSupply())-1
    await contract.mintExclusive(accounts[1])
    const url = await contract.tokenURI(nextToken)
    const urlLast = await contract.tokenURI(lastToken)
    assert.equal(metadata+ String(sup - 1),urlLast)
    assert.equal(url, metadata + exclusive)
  })


  // Testing withdraw()

  it("Should not allow non-owner to withdraw", async() => {
            try{
                await contract.withdraw(web3.utils.toWei('0.1','ether'),false, {from:accounts[1]});
                throw new Error("***ERROR*** You should have failed to pause here");
            } catch (error) {
                const errmsg = error.message.split("string")[1]
                assert.equal(errmsg, " 'Ownable: caller is not the owner'")
            }
        })
  it("Should increase owner balance", async() => {
      const bal = web3.utils.fromWei(await web3.eth.getBalance(accounts[0]), 'ether')
      const balToWithdraw = web3.utils.toWei('0.1','ether')
      const prevContractVal = web3.utils.fromWei(await web3.eth.getBalance(contract.address), 'ether')
      await contract.withdraw(balToWithdraw, false)
      const newbal = web3.utils.fromWei(await web3.eth.getBalance(accounts[0]),'ether')
      const newContractVal = web3.utils.fromWei(await web3.eth.getBalance(contract.address), 'ether')
      assert.equal(true, Number(newbal)>Number(bal))
      assert.equal(Math.round(1000*Number(newContractVal)),Math.round(1000*(Number(prevContractVal)-0.1)))
  })

  it("Should take all $ from contract", async()=>{
    const bal = web3.utils.fromWei(await web3.eth.getBalance(accounts[0]), 'ether')
    const prevContractVal = web3.utils.fromWei(await web3.eth.getBalance(contract.address), 'ether')
    await contract.withdraw(0, true)
    const newbal = web3.utils.fromWei(await web3.eth.getBalance(accounts[0]),'ether')
    const newContractVal = web3.utils.fromWei(await web3.eth.getBalance(contract.address), 'ether')
    assert.equal(newContractVal,0)
    assert.equal(Math.round(1000*(Number(newbal)-Number(prevContractVal))), Math.round(1000*Number(bal)))
  })

  it("Should set exclusiveURI", async()=>{
    await contract.setExclusiveURI("testing.json")
    const nextToken = Number(await contract.totalSupply())
    await contract.mintExclusive(accounts[1])
    const url = await contract.tokenURI(nextToken)
    assert.equal(url, metadata + 'testing.json')
  })

    //BELOW checks all tokens minted (230+ seconds)
    
    it("Should query all tokens to ensure no unminted tokens and check 4446", async() => {
      const ts = Number(await contract.totalSupply())
      for (var i = 0; i < ts; i++){
            await contract.tokenURI(i)
        }
        assert.equal(0,0)
        try{
            await contract.tokenURI(ts)
            throw new Error("***ERROR*** The above should have failed");
        } catch(error){
            const errmsg = error.message.split("string")[1]
            assert.equal(errmsg, " 'ERC721Metadata: URI query for nonexistent token'")
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
    try{
        await contract.setBaseURI('ipfs://QmWUdmtZsRtbTbUYt8bV5ijLViDQx63LhCSBYzeK4hpsYX/');
        throw new Error("***ERROR*** You should have failed to pause here");
    }catch (error){
        const errmsg = error.message.split("string")[1]
        assert.equal(errmsg, " 'Metadata has been locked and permenantly decentralized'")
    }
  })

  it("Should lock up supply and not allow adjustments on normal supply", async() => {
    await contract.lockSupply();
    try{
        await contract.adjustSupply(100000);
        throw new Error("***ERROR*** You should have failed to pause here");
    }catch (error){
        const errmsg = error.message.split("string ")[1]
        assert.equal(errmsg, "'Supply is permenatly locked'")
    }
  })

  it("Should indicate how many adr1 minted", async()=>{
    await contract.mintNFT({from:accounts[2], value:web3.utils.toWei('1','ether')})
    const mintnum = await contract.numberMinted(accounts[2])
    console.log(mintnum)
    assert.equal(mintnum,12)
  })

})


contract("LelandNFTs testing #2", async accounts => {
  var contract;
  it("Should estabilsh first eth address as owner", async () => {
    const inputWei = web3.utils.toWei('0.044', 'ether')
    const deployedV = await CW.new(metadata, exclusive, inputWei);
    contract = deployedV;
    await contract.pause()
    await contract.airDrop([accounts[1]],[50])
  })
})