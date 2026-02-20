# ChainLinked - Detailed Tickets from Google Doc

## Tab 1: Overview Menu UI/UX

---

### ONBOARDING

1. **After downloading the chrome extension, when clicking on it, it should open a browser leading to the onboarding page**

2. **[HIGH] After signing up, should prompt the user to verify their email**
   - Show a dedicated "Your email address is not verified" page

3. **Can we update the 'Confirm Your Signup' email to make it brand-aligned?**
   - Current email is generic Supabase Auth default

4. **Can we add ChainLinked's logo on the LinkedIn OAuth page & place Allow button above Cancel if possible**

5. **Brand color and logo extraction isn't always reliable**
   - Gong.io -> extracted yellow, blue, light blue instead of purple and white
   - Extracted Dropbox logo instead of Gong's

6. **Make the Review Brand Context / Edit Company Information popup window slightly longer**

7. **Can't add my own comma in Tone Descriptors**

8. **For Example Phrases: Allow 'Enter' in this box without 'Save' being triggered**

---

### DASHBOARD

9. **Welcome back greeting shows username instead of display name**
   - Extract name from either:
     - Chrome extension signup (first and last name)
     - LinkedIn onboarding process (connecting to LinkedIn)

10. **Update the email to name when clicking on the avatar on top right**

11. **Remove the whole row: New Post, Schedule, Templates, Analytics** (quick action cards)

12. **[HIGH] Add "i" icon next to each metric (Impressions, Followers, Engagement, Profile Views)**
    - Explain where the data is from, how it's calculated, what current and last periods are

13. **If data not available yet, show "-" where data should be**
    - Replace placeholder values with "Hold on, we're getting the data for you"

14. **GOAL: Stabilize the data shown across the platform. Be transparent about data not being there yet rather than risking user's trust**

15. **[HIGH] Data syncing banner at top of Dashboard and ALL pages**
    - "LinkedIn data syncing may take up to 24 hours. In the meantime, feel free to explore features in Create."

16. **[HIGH] #impressions, #reactions, comments aren't accurate in some posts**
    - Implement mechanism across platform: indicate data is being extracted or unavailable instead of defaulting to zero

17. **Update the schedule section on dashboard to match Schedule tab design**
    - Keep calendar and list of Scheduled Posts

18. **Dashboard should have: metrics cards, calendar, list of scheduled posts only**

---

### OVERALL MENU STRUCTURE & ACROSS ALL PLATFORM

19. **Remove 'Compose', 'Schedule', 'Posts' under OVERVIEW sidebar section**

20. **Rename 'Analytics' to 'Analytics & Goals'**

21. **Rename 'Team' to 'Team Activity'**

22. **Sidebar order should be:** 1. Dashboard, 2. Analytics & Goals, 3. Team Activity

23. **Rename 'Views' to 'Impressions' across the platform**

24. **Rename all 'Likes' -> 'Reactions'** (= # likes + loves + insights + ...)

25. **Refactor Engagement metric = # Reactions + # Comments + # Shares + # Reposts**

---

### ANALYTICS & GOALS

26. **Bring 'Recent Activity' card from Dashboard here, rename to "My Recent Posts"**
    - Include missing metrics: Comments, Reposts, etc.

27. **Redesign the 4 data cards into 1 card named "Performance Overview"**

28. **Rename 'Performance Overview' to 'Performance Trend'**
    - Description: "Track your metrics over time. Choose metric on the right."

29. **Remove multiple metrics overlay on graph - only 1 metric at a time**
    - Add "Metric" dropdown filter to the left of 7D|30D|90D filter

30. **Keep Metric Name & Number (colored) and Average & Number (white)**

31. **Rename "Avg. Rate" to "Average"**

32. **Expand Performance Trend card horizontally (Move Posting Goals below)**

33. **Posting Goals: If never set, show "Create your goals to view"**

34. **Add kebab menu (3 dots) on each goal card: Edit Goals, Remove Goals**
    - Edit Goals -> popup with same design as Create Goals (# posts & Time Period)
    - Remove Goals -> confirmation dialog

35. **Move 'Team Leaderboard' to Team Activity Tab**

36. **Hide Post Performance for now** (comment out) - bring back later

---

### TEAM ACTIVITY

37. **Rename 'Team Leaderboard' to 'Top Influencers'**

38. **Update Top Influencers design - show everyone in the team**
    - Metrics: Posts (total), Reactions (total), Comments (total), Impressions (total)
    - Remove Total Engagement
    - Add Gold/Silver/Bronze medals next to each Rank
    - Ranking based off # Impressions
    - Time filters: "This Week", "This Month"

39. **Rename 'Recent Activity' to 'Recent Team Activity'**
    - Rolling 7 days only; 10 posts per page
    - Only posts created by team members (no reactions/reposting)
    - Remove 'View All' button
    - Design matches list of posts in Analytics

---

## Tab 2: Content Menu UI/UX

---

### CONTENT MENU STRUCTURE

40. **Rename 'Template' to 'Template Library'**

41. **Rename 'Carousels' to 'Create Carousel'**

42. **Rename 'Quick Create' to 'Create Post'**

43. **Create 'Saved Drafts' section** - all drafts from Quick Create, Swipe, Discover, Inspiration saved here

44. **Merge 'Inspiration', 'Discover', 'Swipe' into one menu called 'Inspiration'**

45. **Content menu order:** Saved Drafts, Inspiration, Create Carousel, Template Library

---

### CREATE POST

46. **Research method to @ people/org on LinkedIn when creating posts**

47. **Attaching image/doc doesn't reflect the Preview on the right**

48. **Keep AI Generate on the left expanded at all times even after generated**

49. **Keep all contents & settings in AI Generate even after generated**

50. **If Preview/Editing box gets long, extend the box instead of user scrolling**

51. **Move editing options (B, I, list, #, Aa) above the Preview box**

52. **Move action buttons under the Preview/Edit box**
    - Remove 'Quick Actions'
    - Keep: 1) Copy, 2) Copy & Open LinkedIn, 3) Schedule, 4) Post Now

---

### TEMPLATE LIBRARY

53. **Update description to "Manage and share your post templates"**

54. **Rename 'Use' button to 'Create Post'**

55. **Create Template should be a popup in center, not sliding from right**

---

### INSPIRATION (Inspiration + Discover + Swipe)

56. **Tab at top: "Switch between tabs to discover contents to remix into your next post"**
    - 3 tabs: "Viral Posts", "Discover Topics", "Swipe"
    - Rename Inspiration to Viral Posts, Discover to Discover Topics

57. **[HIGH] Bug: After remixing in Discover, cannot scroll down to see results**

58. **Match the logo buttons too** (consistent branding)

---

### SWIPE

59. **Remove Session Progress card on the bottom**

60. **Remove Wishlist**

61. **Auto-trigger generation before user visits page** (pre-generate suggestions)

62. **Update "Post It" thumbs up label to "Saved" with green check mark**

63. **Create 'Save in Draft' option after clicking Remix**

---

### CAROUSELS

64. **Template selection shown (Brand Professional, Brand Bold)**

---

## Additional User Requirements (not from doc)

65. **Use ChainLinked logo from extensions folder everywhere** - favicon, platform branding, etc.

66. **Email verification page** - After signup, show dedicated page saying "Your email address is not verified. Please verify your email address" instead of just a toast

67. **Compose section redesign**:
    - Left side: ONLY AI generation (no text editing, no tooltip toolbar)
    - Right side: Double-tap to edit post like a normal editor

68. **Background removal** - Use external API instead of built-in (user will provide API key)

69. **Swipe section dynamic refill**:
    - 10 suggestions total
    - If 3 declined, run ingest cron job to prepare 3 more and fill the space

70. **Discover section cron job** - Get latest stories/content

71. **Draft auto-save**:
    - If composing a post and navigating away, auto-save to localStorage temporarily
    - Then store in Supabase as well

72. **Save post to backend** - Posts composed should be saved to Supabase

73. **Commit after each feature completion**
