App = {
  web3Provider: null,
  // Contract definitions
  contracts: {},
  // Contract instances to interact with, see initContract()
  cNftInstance: null,

  init: async function() {
    return await App.initWeb3();
  },

  initWeb3: async function() {
    // Modern dapp browsers...
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        // Request account access
        await window.ethereum.enable();
      } catch (error) {
        // User denied account access...
        console.error("User denied account access")
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    }
    // If no injected web3 instance is detected, fall back to Ganache
    else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    }
    web3 = new Web3(App.web3Provider);

    return App.initContract();
  },

  initContract: function() {
    $.getJSON('ZTestNftv1.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with @truffle/contract
      var ContractArtifact = data;
      App.contracts.Nft = TruffleContract(ContractArtifact);
      console.log("Loaded NFT contract: %o", ContractArtifact.networks);

      // Set the provider for our contract
      App.contracts.Nft.setProvider(App.web3Provider);

      App.contracts.Nft.deployed().then(function(instance) {
        App.cNftInstance = instance;

        App.updateUi();
      });

    });

    return App.bindEvents();
  },

  bindEvents: function() {
    $('#btnCheckMinter').on('click', App.handleCheckMinter);
    $('#btnAddMinter').on('click', App.handleAddMinter);

    $('#btnMint').on('click', App.handleMint);
    $('#btnPauseMinting').on('click', function() { App.setMintingPaused(true); });
    $('#btnAllowMinting').on('click', function() { App.setMintingPaused(false); });

    $('#btnPausePublicMinting').on('click', function() { App.setAllowPublicMinting(false); });
    $('#btnAllowPublicMinting').on('click', function() { App.setAllowPublicMinting(true); });

    $('#btnSetBaseUri').on('click', App.handleSetBaseUri);

    $('#btnWithdraw').on('click', App.handleWithdraw);

    $('#btnSetOwner').on('click', App.handleSetNewOwner);
  },

  updateUi: function() {
    web3.eth.getAccounts(function(error, accounts) {
      var displayText = '...';
      if (error) {
        displayText = error;
      }
      else {
        displayText = accounts[0];
      }

      $("#connectedAccountDisplay").text(displayText);
    });

    App.cNftInstance.mintingPaused.call().then(function(mintingPaused) {
      $("#mintingPausedDisplay").text(mintingPaused ? "Yes" : "No");
    });

    App.cNftInstance.allowPublicMint.call().then(function(isAllowed) {
      $("#publicMintingAllowedDisplay").text(isAllowed ? "Yes" : "No");
    });

    App.cNftInstance.BASE_URI.call().then(function(baseUri) {
      $("#baseUriDisplay").text(baseUri ? baseUri : "-- Not Set --");
    });

    App.cNftInstance.owner.call().then(function(owner) {
      $("#ownerDisplay").text(owner ? owner : "-- Not Set --");
    });
  },

  setAllowPublicMinting: function(isAllowed) {
    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      App.cNftInstance
          .setAllowPublicMint(isAllowed, { from: accounts[0] })
          .then(App.updateUi)
      ;
    });
  },

  setMintingPaused: function(isPaused) {
    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      App.cNftInstance
          .setMintingPaused(isPaused, { from: accounts[0] })
          .then(App.updateUi)
      ;
    });
  },

  handleMint: function() {
    // todo: read this from the contract
    var mintPrice = web3.toWei(0.123);

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      App.cNftInstance
          .mint({ from: accounts[0], value: mintPrice })
          .then(App.updateUi)
      ;
    });
  },

  handleCheckMinter: function() {
    var mintingBy = $("#txtCheckMinterAddress").val();
    console.log("Checking if %o can mint", mintingBy);
    $("#canMintResultDisplay").text("Checking...");

    App.cNftInstance
      .isMinter.call(mintingBy)
      .then(function(result) {
        console.log("is minter? %o", result);
        var displayText = result ? 'Yes' : 'No';
        $("#canMintResultDisplay").text(displayText);
      });
  },

  handleAddMinter: function() {
    var minterAddress = $("#txtAddMinterAddresses").val().split("\n");
    console.log("Adding: %o", minterAddress);

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      App.cNftInstance
          .addToMinters([minterAddress], { from: accounts[0]})
          .then(function(result) {
            console.log("Added to minters list");
          });
    });
  },

  handleSetBaseUri: function() {
    var baseUri = $("#txtNewBaseUri").val();

    // Ensure URI has a trailing slash
    if (!baseUri.endsWith("/")) baseUri = baseUri + "/";

    console.log("Setting base URI to: %o", baseUri);

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      App.cNftInstance
          .setBaseURI(baseUri, { from: accounts[0]})
          .then(function(result) {
            console.log("Set base URI");
            App.updateUi();
          });
    });
  },

  handleWithdraw: function() {
    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      App.cNftInstance
          .withdraw({ from: accounts[0]})
          .then(function(result) {
            console.log("Withdrawal complete");
          });
    });
  },

  handleSetNewOwner: function() {
    var newOwnerAddr = $("#txtNewOwner").val().trim();

    if (!confirm("Are you sure you want to set the new owner to '" + newOwnerAddr + "'?")) return;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      App.cNftInstance
          .transferOwnership(newOwnerAddr, { from: accounts[0]})
          .then(function(result) {
            console.log("Ownership transferred");
            App.updateUi();
          });
    });
  },

};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
