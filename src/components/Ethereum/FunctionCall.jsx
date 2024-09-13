import { useState, useEffect } from 'react';

import PropTypes from 'prop-types';
import { forwardRef } from 'react';
import { useImperativeHandle } from 'react';

const abi = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "ETH_USD_PAIR_PRICE_FEED_ADDRESS",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "METAPOOL_STAKING_AND_MPETH_TOKEN_ADDRESS",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "paramEthQuantityToUse",
          "type": "uint256"
        }
      ],
      "name": "getEthToStablecoin",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getEthUsdPrice18Decimals",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getMpUsdStablecoinAddress",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "mintMpUsdStablecoin",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "userMpethOnVault",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "userUsedMpethToMintStablecoin",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];

// const abi = [
// 	{
// 		"inputs": [
// 			{
// 				"internalType": "uint256",
// 				"name": "newNumber",
// 				"type": "uint256"
// 			}
// 		],
// 		"name": "setNumber",
// 		"outputs": [],
// 		"stateMutability": "nonpayable",
// 		"type": "function"
// 	},
// 	{
// 		"inputs": [],
// 		"name": "getNumber",
// 		"outputs": [
// 			{
// 				"internalType": "uint256",
// 				"name": "",
// 				"type": "uint256"
// 			}
// 		],
// 		"stateMutability": "view",
// 		"type": "function"
// 	},
// 	{
// 		"inputs": [],
// 		"name": "lastAddress",
// 		"outputs": [
// 			{
// 				"internalType": "address",
// 				"name": "",
// 				"type": "address"
// 			}
// 		],
// 		"stateMutability": "view",
// 		"type": "function"
// 	},
// 	{
// 		"inputs": [],
// 		"name": "number",
// 		"outputs": [
// 			{
// 				"internalType": "uint256",
// 				"name": "",
// 				"type": "uint256"
// 			}
// 		],
// 		"stateMutability": "view",
// 		"type": "function"
// 	}
// ];

const contract = '0x3051dEB4cA8413a87362DF7B6dd7d5C86559C720';
// const contract = '0xE2a20c219790501DF0AB8C22b8c7eFBe9bB7a790';

export const FunctionCallForm = forwardRef(({ props: { Eth, senderAddress, loading } }, ref) => {
  const [number, setNumber] = useState(1000);
  const [currentNumber, setCurrentNumber] = useState('');

  async function getNumber() {
    // const result = await Eth.getContractViewFunction(contract, abi, 'getNumber');
    // setCurrentNumber(String(result));
    setCurrentNumber(String("MP_VAULT_CALL"));
  }

  useEffect(() => { getNumber() }, []);

  useImperativeHandle(ref, () => ({
    async createPayload() {
      const data = Eth.createTransactionData(contract, abi, 'mintMpUsdStablecoin', []);
      // const data = Eth.createTransactionData(contract, abi, 'setNumber', [number]);
      const { transaction, payload } = await Eth.createPayload(senderAddress, contract, 0.01, data);
      // const { transaction, payload } = await Eth.createPayload(senderAddress, contract, 0, data);
      return { transaction, payload };
    },

    async afterRelay() {
      getNumber();
    }
  }));

  return (
    <>
      <div className="row mb-3">
        <label className="col-sm-2 col-form-label col-form-label-sm">Counter:</label>
        <div className="col-sm-10">
          <input
            type="text"
            className="form-control form-control-sm"
            value={contract}
            disabled
          />
          <div className="form-text">Contract address</div>
        </div>
      </div>
      <div className="row mb-3">
        <label className="col-sm-2 col-form-label col-form-label-sm">
          Number:
        </label>
        <div className="col-sm-10">
          <input
            type="number"
            className="form-control form-control-sm"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            step="1"
            disabled={loading}
          />
          <div className="form-text"> Action to perform: <b> {currentNumber} </b> </div>
        </div>
      </div>
    </>
  );
});

FunctionCallForm.propTypes = {
  props: PropTypes.shape({
    senderAddress: PropTypes.string.isRequired,
    loading: PropTypes.bool.isRequired,
    Eth: PropTypes.shape({
      createPayload: PropTypes.func.isRequired,
      createTransactionData: PropTypes.func.isRequired,
      getContractViewFunction: PropTypes.func.isRequired,
    }).isRequired,
  }).isRequired
};

FunctionCallForm.displayName = 'EthereumContractView';