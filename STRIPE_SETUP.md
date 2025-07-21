# Stripe Integration Setup

This application now includes Stripe checkout integration for subscription payments with **dynamic pricing** - no pre-created products needed!

## 1. Stripe Account Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the Stripe Dashboard

## 2. Environment Variables

Add these environment variables to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

**That's it!** No product IDs needed - the application creates products dynamically.

## 3. How It Works

The application automatically creates Stripe products and prices on-the-fly:

### Dynamic Product Creation
- **Homeowner**: $19.99/month (recurring)
- **Contractor**: $97.99/month or $999.99/year (recurring)
- **Inspector**: $97.99/month or $999.99/year (recurring)
- **Insurance Adjuster**: $97.99/month or $999.99/year (recurring)

### Benefits of Dynamic Pricing
- ✅ No manual product setup required
- ✅ Easy to modify pricing in code
- ✅ Automatic product creation
- ✅ Cleaner Stripe dashboard
- ✅ Faster setup process

## 4. Webhook Setup (Optional but Recommended)

Set up webhooks in your Stripe Dashboard to handle subscription events:

1. Go to Stripe Dashboard > Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

## 5. Testing

Use Stripe's test card numbers for testing:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **Expiry**: Any future date
- **CVC**: Any 3 digits

## 6. Production Deployment

For production:
1. Switch to live API keys
2. Update webhook endpoints to production URLs
3. Test the complete payment flow
4. Monitor webhook events in Stripe Dashboard

## Pricing Configuration

The current pricing is configured in `server/routes.ts`:

```javascript
const rolePricing = {
  homeowner: {
    monthly: 1999, // $19.99 in cents
    yearly: null, // No yearly option
  },
  contractor: {
    monthly: 9799, // $97.99 in cents
    yearly: 99999, // $999.99 in cents
  },
  inspector: {
    monthly: 9799, // $97.99 in cents
    yearly: 99999, // $999.99 in cents
  },
  "insurance-adjuster": {
    monthly: 9799, // $97.99 in cents
    yearly: 99999, // $999.99 in cents
  },
};
```

## Flow Overview

1. User fills out signup form (Step 1)
2. User selects role and billing period (Step 2)
3. User reviews subscription details (Step 3)
4. User clicks "Start Subscription"
5. Firebase account is created
6. Stripe checkout session is created
7. User is redirected to Stripe checkout
8. After payment, user is redirected to success page
9. If cancelled, user is redirected to cancel page 