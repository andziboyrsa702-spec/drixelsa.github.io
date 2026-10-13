export const HELP_UPDATED='2026-10-13';
export const helpCategories=['Account & membership','Shopping & products','Orders & payments','Delivery & returns','Privacy & support'];
const article=(slug,category,title,summary,sections,action,label)=>({slug,category,title,summary,sections,action,label});
export const helpArticles=[
 article('sign-in',0,'How to sign in','Access your Drixel account and find your orders.',[
 ['Open your account','Select the account icon in the store header and choose Sign in. Enter the email and password you used when creating your Drixel account. If you originally used Google, choose Continue with Google and select the same Google account.'],
 ['Use the correct email','Order history is connected to your account. A different email or Google account may show an empty history. Check the email address on your order confirmation before creating another account.'],
 ['If sign-in fails','Check spelling, keyboard case and your connection. Use Forgot password? if you cannot remember the password. After three unsuccessful password attempts, this browser pauses password sign-in for 15 minutes. Resetting your password remains available.'],
 ['On a shared device','Do not save your password on a public computer. Sign out when you finish and close the browser. Never send your password, verification code or authenticator recovery code to customer care.']
 ],'member/login','Sign in'),
 article('become-a-member',0,'How to become a member','Create a free account for shopping and order history.',[
 ['Create an account','Open Sign in and select Create account. Enter your full name, email address, a password of at least eight characters and the same password again. Select Create account once and wait for confirmation. You can also choose Continue with Google.'],
 ['What membership includes','Your account brings together your profile and available order history. You can use a wishlist and choose optional shopping reminders. Membership is free; creating an account does not place an order or subscribe you to promotional email.'],
 ['Your profile','Open your account to check your name, profile photo and delivery information. Keep contact details accurate so customer care can help with your orders. Review the delivery address again at checkout.'],
 ['Release updates are optional','Join the newsletter separately if you want promotional updates. You can unsubscribe later. Membership does not promise points, discounts or benefits that have not been announced.']
 ],'member/login?mode=register','Create account'),
 article('reset-password',0,'Reset a forgotten password','Recover password access without creating a second account.',[
 ['Request the link','On the Sign in page select Forgot password? Enter the email attached to your Drixel account. The store displays a neutral confirmation to protect account privacy.'],
 ['Check your inbox','Check spam and promotions folders as well as your inbox. Follow the most recent reset link, choose a new password and return to sign in. An old or expired link may need to be requested again.'],
 ['Google accounts','If you use Continue with Google, access may depend on your Google account. Use Google’s own recovery process if you cannot access that account. Do not send any reset link to another person.'],
 ['Still unable to access orders?','Contact customer care with your order reference and the email used at checkout. Do not create duplicate orders or pay again to resolve an account problem.']
 ],'member/login','Reset from sign-in'),
 article('verify-email',0,'Verify your email for reminders','Confirm that stock and shopping reminders reach your own inbox.',[
 ['Why verification matters','Optional email reminders require a verified account email. This helps prevent someone from signing another person up for unwanted messages.'],
 ['Send a verification email','Open your bag or wishlist while signed in. In the email-reminder section, select Send verification email if prompted. Open the message in the correct inbox and follow its link.'],
 ['Refresh your sign-in','After following the verification link, sign out and sign in again so the store reads the updated verification status. Then return to your bag, wishlist or the sold-out product.'],
 ['If nothing arrives','Check spam, confirm that you used the correct email, and allow time before trying again. If the address is wrong or inaccessible, contact customer care. Never share the verification link publicly.']
 ],'wishlist','Open wishlist'),
 article('profile-photo',0,'Profile details and photos','Keep your account recognisable and your contact details current.',[
 ['Open your profile','Sign in and open your account profile. Review the available name, photo and saved-address fields. Save changes and wait for confirmation before leaving the page.'],
 ['Choose your picture','Use the photo controls provided in your profile. A linked sign-in provider may supply a photo. If a photo is absent, the store can show initials until a valid picture is available.'],
 ['Orders keep their own details','Changing a saved address does not automatically redirect an order already placed. Contact customer care promptly with the order reference if that order needs correction.'],
 ['Protect your information','Use a photo you have permission to use. Do not put identity documents, bank cards or private information in your profile image.']
 ],'member/profile','Open profile'),
 article('place-an-order',1,'How to place an order','From choosing your size to checking your order reference.',[
 ['Choose your product','Open a product page, read its description and inspect the photos. Choose an available colour and size where required. Check the size guide and any product-specific measurements.'],
 ['Review your bag','Select Add to bag. In your bag, check the exact items, options and quantities. Remove anything you do not want before continuing. Adding an item does not complete a purchase.'],
 ['Complete checkout','Sign in, enter accurate delivery details, select an available payment method and review the verified delivery charge, discounts and total. Only proceed when the order summary is correct.'],
 ['Pay and keep the reference','Follow the instructions for the selected method. Save your order reference. An order submission or payment redirect alone does not confirm payment. Your order page shows the recorded status.'],
 ['If the page closes','Open your account and check orders before submitting again. If your bank shows a payment but the order is pending, contact customer care with the reference instead of paying twice.']
 ],'w/new-featured','Shop products'),
 article('sizes-and-colours',1,'Sizes, colours and fit','Choose the right option before adding to your bag.',[
 ['Product-specific choices','Available size and colour buttons are shown on each product page. Sold-out options cannot normally be added to the bag. Choose all required options before selecting Add to bag.'],
 ['Use the measurements provided','Open Size guide & measurements from the product page. Compare the published measurements with a similar garment that fits you. Fit can differ between products; do not assume every garment uses the same measurements.'],
 ['Photographs and colour','View front, back and detail photographs. On touch screens, scroll through the images below the main photo. Lighting and screens can affect appearance; contact customer care if you need clarification.'],
 ['Unsure about an option','Ask before buying when measurements or details are missing. We do not want you to guess a fabric composition or fit that has not been published.']
 ],'size-guide','Open size guide'),
 article('wishlist',1,'Save and revisit your wishlist','Keep products you like together while deciding.',[
 ['Save a product','Select Save to wishlist on the product page. Open your wishlist to revisit those products or remove selections you no longer want. A wishlist is not an order and does not reserve stock.'],
 ['Moving between devices','A selection can be stored on the current browser. If you enable verified-account reminders, the restore link can load the saved, available selection on another device after you sign in to the same account. Read the replacement notice before restoring.'],
 ['Choose email reminders','Use the optional wishlist reminder checkbox. The reminder is scheduled after seven days for available items still saved, subject to your preferences and the shared reminder frequency limit.'],
 ['When items change','Prices and stock can change while items are saved. Review the current product and checkout information before purchasing.']
 ],'wishlist','Open wishlist'),
 article('bag-reminders',1,'Bag and wishlist email reminders','You control whether Drixel sends a reminder.',[
 ['Turn reminders on','Sign in with a verified email, then use the reminder checkbox in your bag or wishlist. The option is voluntary. Creating an account or adding a product does not by itself subscribe you.'],
 ['When reminders are considered','Bag reminders wait at least 24 hours. Wishlist reminders wait seven days. Bag and wishlist reminders share a limit of at most one per week per account, and delivery can be later if email capacity is busy.'],
 ['What stops a reminder','Removing items, disabling the preference, an unsubscribe, unavailable items or a matching order can prevent a reminder. These checks help avoid chasing items you have already ordered.'],
 ['Restore or stop','The email links back to the saved selection. Sign in to the same account before restoring it. Use the preference checkbox or the unsubscribe link to stop reminders. Essential order updates remain separate.']
 ],'cart','Open bag'),
 article('back-in-stock',1,'Get a back-in-stock alert','Ask for an email about a sold-out size or colour.',[
 ['Choose the exact option','On a sold-out product option in the South African store, find Waiting for your size? Choose the size and colour you want from the sold-out list. Sign in with a verified email first.'],
 ['Confirm your choice','Tick the permission checkbox and select Notify me. The request lasts for 30 days and is for the selected option, not every option of that product. You can follow up to 20 options at once.'],
 ['If stock returns','The store checks stock periodically and can send one alert when that option becomes available. Availability is not guaranteed when you open the email, and an alert does not reserve stock. At most one stock alert is attempted per account per day.'],
 ['Cancel an alert','Reopen the product and select Cancel stock alert for that option, or use the email’s preference link. A matching order or existing email suppression can prevent an alert.']
 ],'w/new-featured','Browse products'),
 article('payment-methods',2,'Payment methods and currencies','Use the methods actually offered for your order.',[
 ['Available methods','Checkout displays the payment methods currently enabled for your destination and order. A logo or a mention in a guide does not guarantee that method is connected. If a method is absent, choose an offered method or contact customer care.'],
 ['Currency','Browsing prices may be estimates in the selected country’s currency. Orders and payments are charged in ZAR. Review the checkout disclosure, total and any exchange-rate or bank-fee implications before confirming.'],
 ['Card checkout','If card payment is offered, use the secure payment flow reached from your order. Complete any bank verification required there. Never send card numbers, CVV or one-time passwords by email or in a support form.'],
 ['Payment status','Pending means the payment has not been confirmed by the store. Paid means it has been recorded as verified. Keep your order reference and contact care if the payment and order status disagree.']
 ],'cart','Review your bag'),
 article('bank-transfer',2,'Paying by bank transfer','Use the exact instructions linked to your order.',[
 ['Read the order instructions','Choose bank transfer only when it is available at checkout. Use the bank details, reference and exact ZAR total provided for that order. Do not use details copied from a social media comment or an old screenshot.'],
 ['Include the reference','Enter the order reference correctly so the payment can be reconciled. Keep your payment record. A screenshot alone is not confirmation that funds have reached the store.'],
 ['Allow verification','The order can remain pending while the payment is checked. Dispatch follows verified payment and acceptance. Ask customer care if you are unsure whether your payment was received.'],
 ['Cancelled or disputed orders','Do not pay a cancelled order. If you have already paid and see a cancellation or a payment-review message, contact customer care before making another transfer.']
 ],'member/orders','View orders'),
 article('snapscan',2,'Using SnapScan when available','Follow the QR or payment link attached to the order.',[
 ['Start from checkout','Choose SnapScan only if the store offers it for your order. Use the QR code or payment link shown on your order page. Check the merchant, amount and reference before approving payment.'],
 ['Keep the order open','Follow the payment instructions and allow the order to update. A scan or opening a link does not itself mean the payment succeeded.'],
 ['If confirmation is delayed','Check the recorded order status. If money has left your account, contact customer care with your order reference and payment record. Do not make another payment just because confirmation is delayed.'],
 ['When the option is missing','The payment integration may not be enabled. Use an available checkout method. Customer care can explain options for your order.']
 ],'member/orders','Check order status'),
 article('order-status',2,'Understand your order status','Find what has happened and what needs attention.',[
 ['Open your orders','Sign in with the account used at checkout and open My orders. Select the order to see its reference, purchased items, payment status and available delivery details.'],
 ['Payment and fulfilment differ','Payment status records the payment. Processing, packed, shipped or delivered describe fulfilment. A paid order may still be waiting to be packed. A created order can still be unpaid.'],
 ['Tracking','When customer care has added courier details, the order page shows the tracking number and an available secure courier link. A tracking number can exist before the courier has scanned the parcel.'],
 ['Missing order','Check the correct email account and your confirmation. If the order is absent, provide its reference to customer care. Do not post references, addresses or payment records in public comments.']
 ],'member/orders','Open my orders'),
 article('cancel-an-order',2,'How to request cancellation','Tell customer care promptly and keep a written record.',[
 ['Find the reference','Open My orders and copy the order reference. Note whether payment has been made and whether the parcel has been dispatched.'],
 ['Contact customer care','Use the Contact page with the reference and a clear request to cancel. For a paid order you can also open a refund request from the order page. Submission records your request; it does not automatically cancel dispatch or issue a refund.'],
 ['Before dispatch','Contact us as soon as possible so the team can review the order before it leaves. Do not make a payment on an order whose cancellation has been confirmed.'],
 ['After dispatch or payment','The appropriate return or refund process depends on your order and applicable rights. Read the returns policy and keep all correspondence. Do not send goods to an address that has not been confirmed.'],
 ['Your rights','This guide explains the practical route for contacting us. It does not replace the returns policy or shorten any statutory notice period. Email customer care in time even if you cannot access the dashboard.']
 ],'contact','Contact customer care'),
 article('change-order-address',2,'Change an order or delivery address','Ask for help before the order is dispatched.',[
 ['Check the order first','Review the items, size, colour, phone number and delivery address on the order. Copy the reference before contacting care.'],
 ['Request the correction','Explain exactly what needs changing. A saved-profile edit does not change an existing order, and stock or fulfilment progress may affect whether an item can be changed.'],
 ['Wait for confirmation','Do not assume an email request has redirected a parcel. Customer care must confirm what can be changed and whether any revised amount or delivery arrangement needs your agreement.'],
 ['If it has already shipped','Ask customer care to investigate available courier options. Do not share personal delivery information publicly.']
 ],'contact','Request a correction'),
 article('delivery-tracking',3,'Delivery and tracking','Find parcel updates and report delivery issues.',[
 ['Delivery availability','The selected country controls browsing and currency, but checkout must confirm whether delivery is available for the product and address. Review the shipping charge and total before paying.'],
 ['Processing and transit','Read the shipping policy for the published estimates and exceptions. Your confirmed order arrangements take priority over assumptions from a general guide. Customer care can investigate delays.'],
 ['Track your parcel','Open the order page and use the tracking number and courier link when supplied. For collection services, follow the agreed collection point, identification requirements and deadline.'],
 ['Missing or damaged delivery','Contact customer care promptly with the order reference and a description of the issue. Photos can help explain damage. Keep packaging and available delivery evidence while the matter is investigated.']
 ],'member/orders','Track from my orders'),
 article('request-return',3,'Request a return or exchange','Select purchased items and follow your case updates.',[
 ['Open the paid order','Sign in, open My orders and select the relevant order. Find Returns & exchanges. If sign-in or verification prevents access, contact customer care directly; the form is not the only way to give notice.'],
 ['Choose items and quantities','Choose Refund or Exchange and enter a quantity for each item concerned. Quantities cannot exceed those purchased. Add optional details; for an exchange, describe the preferred size or colour.'],
 ['Submit once','Select Submit request and check that your case appears. A case is currently linked to one order. Contact care to add items or reopen a case rather than repeatedly submitting it.'],
 ['Follow instructions','Customer care reviews the request, updates its status and provides instructions. Do not send goods to an unconfirmed address. Approval alone does not transfer money, reserve replacement stock or arrange a courier.'],
 ['Keep your rights','Read the returns policy for applicable cancellation and defective-goods rights. A reason is optional on the form, and an online process must not prevent you giving timely notice by email.']
 ],'member/orders','Open an order'),
 article('refund-progress',3,'Refund and exchange progress','Understand case updates and when to contact care.',[
 ['Requested and approved','Requested means your case has been received. Approved means the team has agreed the next return step. Read the message attached to the update for collection or return instructions.'],
 ['Received','Received records the return reaching the team. It does not mean a refund is already visible in your bank account. The next action should be explained in your case update.'],
 ['Refunded or exchanged','These statuses record an admin-confirmed completed refund or dispatched replacement with a reference. Payment-provider posting times can differ. Ask customer care for the relevant confirmation if needed.'],
 ['A disagreement or missing refund','Reply to customer care with the order reference, case details and the issue. The policy explains available escalation routes. Do not email full bank-card details.']
 ],'help/returns-policy','Read returns policy'),
 article('privacy-and-email',4,'Privacy and email preferences','Choose reminders and understand what is essential.',[
 ['Separate choices','Newsletter subscription, bag/wishlist reminders and stock alerts are optional. Account creation does not automatically enable them. Order confirmations and return updates help fulfil an existing transaction.'],
 ['Stop promotional messages','Use the unsubscribe or preference link in the relevant email, or turn off an available store checkbox. The shopping-reminder preference page stops bag, wishlist and stock-alert messages together. Newsletter messages have their own unsubscribe.'],
 ['Optional analytics','The footer lets you choose whether to share shopping activity counts. The feature is off until you opt in and respects browser privacy signals. You can switch it off later. Read the privacy notice for details.'],
 ['Requests about your information','Contact customer care for account or personal-information requests. Provide enough context to identify the request, and expect proportionate identity checks. Never send passwords or authenticator codes.']
 ],'help/privacy-policy','Read privacy notice'),
 article('safe-shopping',4,'Shop safely and protect your account','Recognise suspicious requests and protect payment details.',[
 ['Start from the store','Use drixelsa.co.za and the links it provides for checkout and order support. Be cautious of messages that pressure you to pay to a different account or send a code.'],
 ['Keep codes private','Do not share passwords, one-time codes, authenticator approvals or recovery codes. Only approve a sign-in you started and understand. Customer care does not need your password to investigate an order.'],
 ['Suspicious payment requests','Check the order reference and contact details through the website. If a message changes bank details unexpectedly, verify the request with customer care using the published contact page.'],
 ['Account concern','Reset your password where appropriate, review your account and contact care. If payment details were exposed, contact the relevant payment provider or bank through its official support route.']
 ],'contact','Contact customer care'),
 article('contact-support',4,'Contact customer care','Send the details that help resolve your question.',[
 ['What to include','For an order, include the reference, the email used at checkout, a short explanation and the outcome you want. For a product question, include the product name, size and colour.'],
 ['Useful evidence','A screenshot of the error or a photo of the product can help. Hide unrelated personal information, full card numbers and private codes. Never upload identity documents or sensitive records to a public comment.'],
 ['Choose the right route','Use the Contact page for published contact options, Feedback for a general concern, and the order page for an available return request. This help centre provides guidance; browsing it does not send a support ticket.'],
 ['Keep a record','Save your message and the order confirmation. If you have already paid, do not place another order or send another payment solely because a reply or status update is taking time.']
 ],'contact','View contact options')
];
export function findHelp(slug){return helpArticles.find(a=>a.slug===slug)}
