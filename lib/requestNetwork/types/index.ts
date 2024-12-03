export type Currency = {
  id: string;
  hash: string;
  address?: string;
  network: string;
  decimals: number;
  symbol: string;
  type: "ERC20" | "ETH";
  name?: string;
};

export interface IContentData {
  miscellaneous?: {
    labels: string[];
    [key: string]: any;
  };
  creationDate: string;
  invoiceNumber: string;
  note?: string;
  invoiceItems: Array<{
    name: string;
    quantity: number;
    unitPrice: string;
    discount: string;
    tax: {
      type: string;
      amount: string;
    };
    currency: string;
  }>;
  paymentTerms: {
    dueDate: string;
  };
  buyerInfo?: {
    firstName?: string;
    lastName?: string;
    address?: {
      "country-name"?: string;
      locality?: string;
      "postal-code"?: string;
      region?: string;
      "street-address"?: string;
    };
    businessName?: string;
    taxRegistration?: string;
    email?: string;
  };
  sellerInfo?: {
    firstName?: string;
    lastName?: string;
    address?: {
      "country-name"?: string;
      locality?: string;
      "postal-code"?: string;
      region?: string;
      "street-address"?: string;
    };
    businessName?: string;
    taxRegistration?: string;
    email?: string;
  };
}