# ChainLinked Setup Guide

## Summary of Completed Changes

✅ **Inspiration Feature Fixed** - Right swipe now sends posts to the compose screen for editing and saving (not direct posting)

✅ **Theme Toggle Added** - Light/dark mode toggle button added to user menu dropdown

✅ **Color Scheme Updated** - Changed from sage green to LinkedIn blue (#0A66C2 equivalent) across the entire app

## LinkedIn OAuth Setup

### Understanding LinkedIn API Access

LinkedIn has **two types of API access**:

1. **Self-Serve API** (What you'll use) - Available to any developer
   - Allows posting to your own profile
   - No partner application process needed
   - Perfect for personal use and small teams
   - Limited to authenticated user's account

2. **Marketing Developer Platform** (Partner Program)
   - Requires official LinkedIn partnership
   - Allows posting on behalf of other users
   - Requires business verification
   - NOT needed for your use case

### Workaround: Using Self-Serve API Without Official Partnership

Phil is correct - you can use the **regular LinkedIn OAuth API** without being an official app partner! Here's how:

#### Step 1: Create a LinkedIn App

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Click **"Create app"**
3. Fill in the required information:
   - **App name**: ChainLinked
   - **LinkedIn Page**: You'll need to create a company page or use your personal page
   - **App logo**: Upload your logo
   - **Legal agreement**: Accept terms

#### Step 2: Configure OAuth 2.0 Settings

1. In your app dashboard, go to the **"Auth"** tab
2. Add **Authorized redirect URLs for your app**:
   ```
   http://localhost:3000/api/linkedin/callback
   https://yourdomain.com/api/linkedin/callback
   ```
3. Request the following **OAuth 2.0 scopes**:
   - `openid` - Basic authentication
   - `profile` - Access user profile
   - `w_member_social` - Post on behalf of the authenticated member

#### Step 3: Get Your Credentials

1. In the **"Auth"** tab, you'll see:
   - **Client ID**
   - **Client Secret** (click "Show" to reveal)
2. Copy both values

#### Step 4: Configure Environment Variables

Add these to your `.env.local` file:

```env
# LinkedIn OAuth Configuration
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
LINKEDIN_REDIRECT_URI=http://localhost:3000/api/linkedin/callback

# For production, use your actual domain:
# LINKEDIN_REDIRECT_URI=https://yourdomain.com/api/linkedin/callback
```

#### Step 5: Verify Your App (Optional but Recommended)

LinkedIn may ask you to verify your app:
1. Go to the **"Settings"** tab
2. Click **"Verify"**
3. Complete the verification process (usually just email verification)

### Testing LinkedIn OAuth

Once configured, you can test the OAuth flow:

1. Start your development server: `npm run dev`
2. Log into ChainLinked
3. Go to **Settings** → **Connect LinkedIn**
4. You'll be redirected to LinkedIn to authorize the app
5. After authorization, you'll be redirected back with access to post

### Important Notes

- **Development vs Production**: Use different redirect URIs for development and production
- **Token Expiration**: Access tokens expire after 60 days. The app automatically refreshes them using the refresh token
- **Posting Limitations**: You can only post to accounts that have explicitly authorized your app
- **Rate Limits**: LinkedIn has rate limits (100 posts per day per user)

### What You CANNOT Do Without Partnership

❌ Post on behalf of other users without their explicit OAuth consent
❌ Access advanced marketing analytics
❌ Use LinkedIn's Ads API
❌ Access organization APIs beyond basic posting

### What You CAN Do With Self-Serve API

✅ Post content to authenticated users' LinkedIn feeds
✅ Share text posts, images, and articles
✅ Schedule posts via your own system
✅ Access basic profile information
✅ Manage posts for users who've connected their accounts

---

## Canva Template Integration for Carousels

### Approach: Using Canva's Public Design API

Unfortunately, Canva doesn't allow direct embedding/editing of their templates in third-party apps without a paid partnership. However, here are **practical workarounds**:

### Option 1: Pre-Made Template Library (Recommended)

**Implementation Strategy:**

1. **Create Your Own Templates**:
   - Design carousel templates in Canva
   - Export them as PDF/PNG templates with text placeholders
   - Store templates in your project's `/public/templates/` folder

2. **PDF Text Overlay Approach**:
   ```
   /templates/
     ├── carousel-1-template.pdf
     ├── carousel-2-template.pdf
     └── carousel-3-template.pdf
   ```

3. **Use PDF Libraries for Text Insertion**:
   - **pdf-lib** - Modify PDFs programmatically
   - Users select a template
   - App overlays user's text on predefined text areas
   - Export as PDF for LinkedIn carousel

4. **Implementation Steps**:
   ```typescript
   import { PDFDocument, rgb } from 'pdf-lib'

   async function generateCarousel(templatePath: string, slides: string[]) {
     const templatePdf = await fetch(templatePath).then(r => r.arrayBuffer())
     const pdfDoc = await PDFDocument.load(templatePdf)

     slides.forEach((text, index) => {
       const page = pdfDoc.getPages()[index]
       page.drawText(text, {
         x: 50,
         y: 500,
         size: 24,
         color: rgb(0, 0, 0)
       })
     })

     return await pdfDoc.save()
   }
   ```

### Option 2: Canva "Magic Link" Integration (Alternative)

If you want users to edit in Canva directly:

1. **Create Template Designs**:
   - Create carousel templates in Canva
   - Set them to "Anyone with the link can edit"
   - Store template URLs in your database

2. **Deep Link to Canva**:
   ```typescript
   const canvaTemplateUrl = "https://www.canva.com/design/TEMPLATE_ID/edit"

   // In your UI:
   <Button onClick={() => window.open(canvaTemplateUrl, '_blank')}>
     Edit in Canva
   </Button>
   ```

3. **User Flow**:
   - User selects template type
   - Opens in Canva for editing
   - Downloads finished carousel
   - Uploads to ChainLinked for posting

**Pros**: Full Canva editing capabilities
**Cons**: Requires Canva account, extra steps for user

### Option 3: Build Your Own Carousel Editor

For full control and best UX:

1. **Use Fabric.js or Konva.js**:
   - Canvas-based editor in your app
   - Pre-designed templates with drag-and-drop
   - Export to PDF/images

2. **Template Structure**:
   ```typescript
   interface CarouselTemplate {
     id: string
     name: string
     slides: number
     layout: {
       textAreas: { x: number, y: number, width: number, height: number }[]
       imageAreas: { x: number, y: number, width: number, height: number }[]
       colors: { background: string, text: string, accent: string }
     }
   }
   ```

3. **Export Flow**:
   - User edits text in your custom editor
   - Canvas renders the design
   - Export each slide as PNG
   - Combine into PDF using pdf-lib
   - Upload to LinkedIn

### Recommended Approach for ChainLinked

**Use Option 1 (Pre-Made Templates with pdf-lib)**:

1. Create 10-15 professional carousel templates in Canva
2. Export as high-quality PDFs with placeholder text
3. Store in your project
4. Let users:
   - Select a template
   - Fill in text for each slide (simple form)
   - Preview the result
   - Download PDF ready for LinkedIn

This approach:
- ✅ No Canva API partnership needed
- ✅ Simple user experience
- ✅ Professional-looking results
- ✅ Fast implementation
- ✅ No external dependencies

### Example Implementation

I can see there's already a `carousel-creator.tsx` component and `pdf-export.ts` utility. You can enhance these with:

```typescript
// In carousel-creator.tsx
const TEMPLATES = [
  { id: 1, name: 'Professional Blue', path: '/templates/professional-blue.pdf', slides: 5 },
  { id: 2, name: 'Modern Minimal', path: '/templates/modern-minimal.pdf', slides: 7 },
  { id: 3, name: 'Bold Statement', path: '/templates/bold-statement.pdf', slides: 4 },
]

function CarouselCreator() {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0])
  const [slideTexts, setSlideTexts] = useState<string[]>([])

  const handleGenerate = async () => {
    const pdf = await generateCarouselFromTemplate(
      selectedTemplate.path,
      slideTexts
    )
    // Download or post to LinkedIn
  }
}
```

---

## Next Steps

1. **Set up LinkedIn OAuth** using the self-serve API (follow steps above)
2. **Test the Inspiration feature** - verify right swipe sends to compose screen
3. **Test the theme toggle** - check light/dark mode switching
4. **Verify color scheme** - ensure LinkedIn blue is applied throughout
5. **Implement carousel templates** - choose your preferred approach

## Need Help?

- LinkedIn OAuth issues: Check the [LinkedIn API Documentation](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- PDF manipulation: See [pdf-lib documentation](https://pdf-lib.js.org/)
- Carousel design: Reach out if you need template design assistance

---

**All changes have been committed to your codebase and are ready to use!**
