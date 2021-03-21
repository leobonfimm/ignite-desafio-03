import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => Promise<void>;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  function updateLocalStorage(newListCartJson: string) {
    localStorage.setItem('@RocketShoes:cart', newListCartJson);
  }

  const addProduct = async (productId: number) => {
    try {
      const responseStock = await api.get<Stock>(`stock/${productId}`);

      const findProduct = cart.find(product => product.id === productId);

      if (responseStock.data.amount <= 0) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (findProduct) {
        const amount = findProduct.amount + 1;
        updateProductAmount({ productId: findProduct.id, amount });
        return;
      }

      const response = await api.get(`products/${productId}`);

      const {
        id,
        title,
        price,
        image,
      } = response.data;

      const addNewProductListCart = [...cart, {
        id,
        title,
        price,
        image,
        amount: 1
      }]

      setCart(addNewProductListCart);

      updateLocalStorage(JSON.stringify(addNewProductListCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const indexProductCart = cart.findIndex(product => product.id === productId);

      if (indexProductCart < 0) {
        throw new Error();
      }

      const newListWithoutProductId = cart.filter(product => product.id !== productId)

      setCart(newListWithoutProductId);

      updateLocalStorage(JSON.stringify(newListWithoutProductId));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const responseStockProduct = await api.get<Stock>(`stock/${productId}`);

      if (amount < 1) {
        throw new Error();
      }

      if (amount > responseStockProduct.data.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const listWithNewAmountProduct = cart.map(product => {
        if (productId === product.id) {
          product.amount = amount;
          return product
        }

        return product;
      })

      setCart(listWithNewAmountProduct);

      updateLocalStorage(JSON.stringify(listWithNewAmountProduct));
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
