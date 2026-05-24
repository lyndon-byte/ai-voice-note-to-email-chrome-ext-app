import { useEffect } from 'react';
import Pusher from 'pusher-js'
import { getCurrentUser } from '../AuthGuard';


export default function PayScreen() {


  useEffect(() => {

      const user = getCurrentUser()

      const pusher = new Pusher('8cbe830be300102d4937', {
        cluster: 'us2',
        authEndpoint: 'http://localhost:3000/pusher/auth',

      });

      const channel = pusher.subscribe(`private-user-${user.uid}`);

      channel.bind('subscription-payment', (data) => {
        console.log('Received:', data);
      });
      
      console.log(user)

  },[])

  // const handleCheckout = () => {
  //   const checkoutUrl = "https://talking-to-eleven.lemonsqueezy.com/checkout/buy/6c6415f1-9ba6-4ae4-a9f2-8a3000fd4340";
  //   chrome.tabs.create({ url: checkoutUrl });
  // };
 
  return (

      <div>
         realtime payment update test
      </div>

  );
}
