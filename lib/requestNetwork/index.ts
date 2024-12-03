import { Types, Utils, RequestNetwork } from '@requestnetwork/request-client.js';
import { Currency, IContentData } from './types';
import { Web3SignatureProvider } from '@requestnetwork/web3-signature';
import {approveErc20, hasErc20Approval, hasSufficientFunds, payRequest as processPayment} from '@requestnetwork/payment-processor'


/**
 * Prepares a request object for creating a request.
 * 
 * @param {Object} params - The parameters for preparing the request.
 * @param {Currency} params.currency - The currency object for the payment.
 * @param {string} params.currency.type - The type of currency ('ERC20' or 'ETH').
 * @param {string} params.currency.address - The address of the ERC20 token (if applicable).
 * @param {string} params.currency.network - The network of the currency.
 * @param {string} params.payerAddress - The Ethereum address of the payer.
 * @param {string} params.payeeAddress - The Ethereum address of the payee.
 * @param {string} params.amount - The amount to be paid, needs to be in blockchain readable format.
 * @param {IContentData} params.invoiceDetails - The invoice details.
 * @param {string} params.invoiceDetails.creationDate - The creation date of the invoice.
 * @param {string} params.invoiceDetails.invoiceNumber - The invoice number.
 * @param {string} params.invoiceDetails.note - Any additional notes for the invoice.
 * @param {Array} params.invoiceDetails.invoiceItems - The list of items in the invoice.
 * @param {string} params.invoiceDetails.paymentTerms - The payment terms for the invoice.
 * @param {Object} params.invoiceDetails.sellerInfo - Information about the seller.
 * @param {Object} params.invoiceDetails.buyerInfo - Information about the buyer.
 * @param {Object} params.invoiceDetails.miscellaneous - Any miscellaneous information.
 * 
 * @returns {Promise<Object>} A promise that resolves to an object containing:
 *   - requestInfo: Information about the payment request.
 *   - paymentNetwork: Details about the payment network to be used.
 *   - contentData: Detailed invoice information.
 *   - signer: Information about the signer of the request.
 * 
 * @example
 * const requestData = await prepareRequest({
 *   currency: { type: 'ERC20', address: '0x...', network: 'mainnet' },
 *   payerAddress: '0x...',
 *   payeeAddress: '0x...',
 *   amount: '1000000000000000000',
 *   invoiceDetails: {
 *     creationDate: '2023-04-01',
 *     invoiceNumber: 'INV-001',
 *     // ... other invoice details
 *   }
 * });
 */

export function prepareRequest({
  currency,
  payerAddress,
  payeeAddress,
  amount,
  invoiceDetails,
}: {
  currency: Currency;
  payerAddress: string;
  payeeAddress: string;
  amount: string;
  invoiceDetails: IContentData;
}) {
  const isERC20 = currency.type === Types.RequestLogic.CURRENCY.ERC20;
  const currencyValue = isERC20 ? currency.address : "eth";

  return {
    requestInfo: {
      currency: {
        type: currency.type,
        value: currencyValue,
        network: currency.network,
      },
      expectedAmount: amount,
      payee: {
        type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
        value: payeeAddress,
      },
      payer: {
        type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
        value: payerAddress,
      },
      timestamp: Utils.getCurrentTimestampInSecond(),
    },
    paymentNetwork: {
      id: isERC20
        ? Types.Extension.PAYMENT_NETWORK_ID.ERC20_FEE_PROXY_CONTRACT
        : Types.Extension.PAYMENT_NETWORK_ID.ETH_FEE_PROXY_CONTRACT,
      parameters: {
        paymentNetworkName: currency.network,
        paymentAddress: payeeAddress,
        feeAddress: "0x0000000000000000000000000000000000000000",
        feeAmount: "0",
        tokenAddress: currencyValue,
      },
    },
    contentData: {
      meta: {
        format: "rnf_invoice",
        version: "0.0.3",
      },
      creationDate: invoiceDetails.creationDate,
      invoiceNumber: invoiceDetails.invoiceNumber,
      note: invoiceDetails.note,
      invoiceItems: invoiceDetails.invoiceItems,
      paymentTerms: invoiceDetails.paymentTerms,
      sellerInfo: invoiceDetails.sellerInfo,
      buyerInfo: invoiceDetails.buyerInfo,
      miscellaneous: invoiceDetails.miscellaneous,
    },
    signer: {
      type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
      value: payerAddress,
    },
  };
}


/**
 * Creates a new request using the provided parameters and wallet provider.
 * 
 * @param {Object} params - The parameters for creating the request.
 * @param {Types.ICreateRequestParameters} params.requestParams - The request parameters.
 * @param {any} params.walletProvider - The wallet provider for signing the request.
 * @param {boolean} [params.inMemory=false] - Whether to create the request without persisting it on the blockchain (default: false).
 * 
 * @returns {Promise<Object>} A promise that resolves to the created request object.
 *   The request object includes methods like waitForConfirmation() if not created in-memory.
 * 
 * @example
 * // Create a persistent request
 * const request = await createRequest({
 *   requestParams: {
 *     // ... request parameters
 *   },
 *   walletProvider: web3Provider
 * });
 * 
 * @example
 * // Create an in-memory request
 * const inMemoryRequest = await createRequest({
 *   requestParams: {
 *     // ... request parameters
 *   },
 *   walletProvider: web3Provider,
 *   inMemory: true
 * });
 */

export async function createRequest({
  requestParams,
  walletProvider,
  inMemory = false,
}: {
  requestParams: Types.ICreateRequestParameters;
  walletProvider: any;
  inMemory : boolean;
}) {
  const web3SignatureProvider = new Web3SignatureProvider(walletProvider);

  const requestClient = new RequestNetwork({
    nodeConnectionConfig: {
      baseURL: "https://gnosis.gateway.request.network",
    },
    skipPersistence: inMemory,
    signatureProvider: web3SignatureProvider,
  });

  const request = await requestClient.createRequest(requestParams);

  if(!inMemory){
    await request.waitForConfirmation();
  }
  
  return request;
}



/**
 * Pay the request for a given request ID or an in-memory request.
 * 
 * @param {Object} params - The parameters for processing the payment request.
 * @param {string} [params.requestId] - The ID of the request to process (required if inMemoryRequest is not provided).
 * @param {any} [params.inMemoryRequest] - The in-memory request object (required if requestId is not provided).
 * @param {any} params.signer - The signer object for transaction signing.
 * @param {any} params.provider - The provider object for blockchain interaction.
 * @param {number} [params.confirmationBlocks=2] - The number of blocks to wait for confirmation (optional, default is 2).
 * 
 * @returns {Promise<Object>} A promise that resolves to the payment transaction object.
 * 
 * @throws {Error} Throws an error if there are insufficient funds for ERC20 payments or if neither requestId nor inMemoryRequest is provided.
 * 
 * @example
 * // Pay a request using requestId
 * const paymentTx = await payRequest({
 *   requestId: '0x1234...', // The request ID
 *   signer: web3Signer,
 *   provider: web3Provider,
 *   confirmationBlocks: 3
 * });
 * 
 * @example
 * // Pay an in-memory request
 * const paymentTx = await payRequest({
 *   inMemoryRequest: inMemoryRequestObject,
 *   signer: web3Signer,
 *   provider: web3Provider
 * });
 * 
 * // The payment transaction has been processed and confirmed
 * console.log('Payment transaction:', paymentTx);
 */

export async function payRequest({
  requestId,
  inMemoryRequest,
  signer,
  provider,
  confirmationBlocks = 2,
}: {
  requestId?: string;
  inMemoryRequest?: any;
  signer: any;
  provider: any;
  confirmationBlocks: number;
}) {
  let requestData;

  if (inMemoryRequest) {
    requestData = inMemoryRequest.inMemoryInfo?.requestData;
    if (!requestData) {
      throw new Error("Invalid in-memory request");
    }
  } else if (requestId) {
    const requestClient = new RequestNetwork({
      nodeConnectionConfig: {
        baseURL: "https://gnosis.gateway.request.network",
      },
    });

    const request = await requestClient.fromRequestId(requestId);
    requestData = request.getData();
  } else {
    throw new Error("Either requestId or inMemoryRequest must be provided");
  }

  const isERC20 =
    requestData.currencyInfo.type === Types.RequestLogic.CURRENCY.ERC20;
  const payerAddress = requestData.payer?.value;

  if (isERC20) {
    const _hasSufficientFunds = await hasSufficientFunds({
      request: requestData,
      address: payerAddress as string,
      providerOptions: {
        provider,
      },
    });

    if (!_hasSufficientFunds) {
      throw new Error("Insufficient funds");
    }

    const _hasApproval = await hasErc20Approval(
      requestData,
      payerAddress as string,
      provider
    );

    if (!_hasApproval) {
      const _approve = await approveErc20(requestData, signer);

      await _approve.wait(confirmationBlocks);
    }
  }

  const paymentTx = await processPayment(requestData, signer);

  await paymentTx.wait(confirmationBlocks);

  return paymentTx;
}



/**
 * Persists an in-memory request to the Request Network.
 * 
 * @param {any} request - The in-memory request object to be persisted.
 * @throws {Error} If the request is not an in-memory request.
 * @returns {Promise<void>} A promise that resolves when the request is successfully persisted.
 */

export async function persistInMemoryRequest(request: any) {
  const requestClient = new RequestNetwork({
    nodeConnectionConfig: {
      baseURL: "https://gnosis.gateway.request.network",
    },
  });

  if (!request.inMemoryInfo) {
    throw new Error(
      "This request is not in-memory and cannot be persisted. Only in-memory requests can be persisted."
    );
  }

  await requestClient.persistRequest(request);
}


/**
 * Retrieves a request by its ID from the Request Network.
 * 
 * @param {string} requestId - The ID of the request to retrieve.
 * 
 * @returns {Promise<Object>} A promise that resolves to the request data object.
 * 
 * @example
 * const requestData = await getRequestByID('0x1234...');
 * console.log('Request data:', requestData);
 */

export async function getRequestByID(requestId: string) {
  const requestClient = new RequestNetwork({
    nodeConnectionConfig: {
      baseURL: "https://gnosis.gateway.request.network",
    },
  });

  const request = await requestClient.fromRequestId(requestId);

  const requestData = request.getData();

  return requestData;
}



/**
 * Retrieves all requests associated with a given wallet address.
 * 
 * @param {string} walletAddress - The Ethereum address of the wallet to query.
 * 
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of request data objects.
 * 
 * @example
 * const requests = await getRequestsByWalletAddress('0x5678...');
 * console.log('Number of requests:', requests.length);
 * requests.forEach(request => console.log('Request:', request));
 */

export async function getRequestsByWalletAddress(walletAddress: string) {
  const requestClient = new RequestNetwork({
    nodeConnectionConfig: {
      baseURL: "https://gnosis.gateway.request.network",
    },
  });

  const requests = await requestClient.fromIdentity({
    type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
    value: walletAddress,
  });

  const requestsData = [];

  for (const request of requests) {
    requestsData.push(request.getData());
  }

  return requestsData;
}

