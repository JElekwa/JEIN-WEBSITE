Objective
Build a production-ready, interactive contact experience for the J.E.I.N. — Joshua Elekwa Interactive Network website.
Replace the conventional contact form with a guided, branching experience that begins with animated connection cards and continues into a conversational, fill-in-the-blank form.
The final submission must be delivered to both the owner’s email inbox and a CRM.
Do not create only a visual mockup. Implement the working user interface, validation, submission states, integration configuration, and responsive behavior supported by the existing platform.
1. Integrate with the existing website
Modify the existing J.E.I.N. website and retain its current architecture.
Follow the established logo and brand identity.
Use warm cream (#F4E9D8), near-black (#171717), antique gold (#B88A36), plum (#683A73), terracotta (#D77A50), dusty rose (#D5A0A4), and muted sage (#8C9B70).
Use gold and plum as the principal accents.
Maintain readable contrast, generous spacing, and accessible typography.
Use subtle animations, not excessive motion.
Ensure compatibility with desktop, tablet, and mobile.
Do not introduce a new framework if the existing platform already provides an appropriate implementation.
2. Entry point and page layout
Create a page section titled:
“There’s more than one way to connect.”
Supporting text:
“Whether you’re exploring an opportunity, building something interesting, sharing an idea, or simply starting a conversation, choose the path that best describes what brings you here.”
Include two ways to enter the experience:
A prominent “Start a conversation” button on the homepage.
A dedicated interactive experience on the Contact page.
The homepage button should open the Contact page or scroll to its contact section. Preserve the visitor’s selected connection type when navigating between these sections where technically possible.
3. Connection cards
Create six selectable cards.
Card A: Hire me
Description: “Looking for someone who combines commercial understanding, operational experience, and growing technical capabilities? Let’s discuss your team and the problems you need to solve.”
Icon: briefcase.
Card B: Collaborate on a project
Description: “Have a business, technology, automation, website, or process improvement project worth exploring?”
Icon: handshake.
Card C: Business and e-commerce
Description: “Connect about digital commerce, emerging brands, online business, commercial development, and entrepreneurial experiments.”
Icon: storefront.
Card D: O2O Playbook and media
Description: “Suggest a guest, share an industry story, propose a topic, or explore a podcast collaboration.”
Icon: microphone.
Card E: Seven Figure Employee community
Description: “Connect around career development, practical skills, peer learning, professional networking, and community building.”
Icon: users.
Card F: Something else
Description: “Have a question, some feedback, or another reason to reach out? Start here.”
Icon: message-circle.
Each card must:
Have a clear heading and short explanation.
Use a subtle entrance animation and hover/focus effect.
Display a clear selected state.
Be fully keyboard accessible.
Work with touch input on mobile.
Include a “Continue” action or open the next step when selected.
Preserve the selection when the visitor returns to an earlier step.
After selection, show a short confirmation explaining the chosen path and a “Continue” button.
4. Conversational form
Create a multi-step form that feels like a natural introduction rather than a survey.
Use sentence fragments with inline or adjacent input fields, dropdowns, and conditional text fields.
Step 1: Introduction
Display:
“Hi, my name is [your name].”
Field:
Full name — required.
Then:
“I am a [your role]…”
Role dropdown options:
Recruiter or hiring manager.
Business owner or founder.
Consultant or industry professional.
Technology or IT professional.
E-commerce or retail professional.
Marketing or creative professional.
Podcast guest or media contact.
Community organizer.
Student or fellow learner.
Friend or supporter.
Other.
If “Other” is selected, reveal a text field for the person’s role.
Then:
“I work with [company or organization]…”
Fields:
Company or organization — optional.
Industry — dropdown with Technology and IT, Consulting, E-commerce and Retail, Consumer Brands, Education, Nonprofit and Community, Media, Other, and Not Applicable.
If Other is selected, reveal a text field.
Do not require a company for students, individual contacts, or people who are not representing an organization.
Step 2: Why they want to connect
Display:
“I would like to connect about [selected topic]…”
Populate topic choices based on the connection card selected.
For Hire Me:
A job opportunity.
Business analyst or business systems roles.
Consulting or business transformation.
Technology implementation or IT.
Quality assurance or process improvement.
An internship or entry-level opportunity.
General professional networking.
Other.
For Collaborate:
Business analysis or transformation.
Automation or systems improvement.
Website or digital project.
Product concept or prototype.
E-commerce or commercial development.
Research or case study.
Other.
For Business and E-commerce:
Emerging brand development.
Digital commerce.
Website or storefront development.
Marketing or customer acquisition.
Operations or workflow improvement.
Business partnership.
Other.
For O2O Playbook:
Appearing as a guest.
Suggesting a guest.
Proposing a topic.
Sponsorship or partnership.
Sharing an industry story.
Other.
For Seven Figure Employee:
Joining the community.
Career development.
Peer learning or accountability.
Hosting a discussion or event.
Community partnership.
Other.
For Something Else:
General question.
Feedback about the website.
My professional story.
A project not listed here.
Other.
If Other is selected in any dropdown, reveal a relevant text field. Do not leave users stuck with choices that do not match their needs.
Step 3: Conditional follow-up
Display one or two relevant follow-up questions based on the selected connection type.
Examples:
For hiring:
“What role or opportunity did you have in mind?”
“Is there a job description or company link you can share?”
For project collaboration:
“What are you hoping to build, improve, or solve?”
“What stage is the project at?” Options: Exploring, Planning, Prototype, Active project, Other.
For business and e-commerce:
“What business, brand, or opportunity would you like to discuss?”
“What kind of collaboration are you considering?”
For podcast and media:
“What topic or story would you like to discuss?”
“Are you proposing a guest, an episode idea, or a partnership?”
For community:
“What would you most like to participate in?”
“How would you like to contribute?”
For general inquiries:
“What would you like me to know before we connect?”
These follow-up questions should be concise, relevant, and mostly optional. Avoid asking the same question twice.
Step 4: Contact details
Display:
“Here’s how you can reach me back…”
Fields:
Email address — required.
LinkedIn profile URL — optional.
Company website or relevant project URL — optional.
Preferred response method — Email or LinkedIn, if appropriate.
Additional message — optional.
Do not require a phone number.
Include a required acknowledgement of the privacy notice before submission, but do not bundle marketing consent into the same checkbox. If a newsletter opt-in is offered, make it optional and separate.
Step 5: Review
Generate a readable summary from the actual submitted fields.
Example:
“Hi, my name is Jordan. I am a recruiter with Example Company, working in technology and IT. I would like to connect about a business systems opportunity. The role involves improving internal workflows, and I would be happy to share more details.”
The summary must reflect the visitor’s actual answers. Do not fabricate or infer details.
Allow the visitor to go back and edit answers.
Include:
“Edit answers.”
“Send my introduction.”
5. Submission and delivery
Implement real form submission through the platform’s supported integration or a secure backend.
The submission must:
Validate required fields and email format.
Prevent accidental duplicate submissions.
Pass the structured data to the configured form endpoint or backend.
Create or update a contact record in the selected CRM.
Notify the owner’s configured email inbox.
Include the connection type, role, company, industry, selected topic, follow-up responses, message, contact details, consent status, and submission timestamp.
Show a success message only after the server confirms the submission has been accepted.
Display a useful error state if submission fails and preserve the visitor’s answers.
Avoid exposing API keys, CRM tokens, email service secrets, or private configuration in browser-side code.
Prefer a supported native integration, a server-side action, or a secure serverless endpoint. Do not hardcode private credentials in HTML or JavaScript.
If the CRM and email integration are not yet configured, build the UI and integration adapters, identify the required configuration values, and clearly label the integration as pending. Do not pretend messages have been delivered.
CRM mapping
Use a configurable CRM integration. If HubSpot is selected, map:
Email to the contact’s unique email property.
First and last name to the appropriate contact properties.
Company and industry to supported properties.
Connection type to a dedicated custom property or structured inquiry record.
Selected topic to an inquiry category.
Message and follow-up responses to an associated note, engagement, or inquiry record where supported.
Source to “J.E.I.N. Website Contact.”
Submission timestamp to the appropriate date property.
Preserve the full inquiry even if the CRM has no dedicated property for every answer. Avoid overwriting existing CRM data with empty values.
Email notification
Send a notification to the owner’s configured inbox with:
A clear subject such as “[J.E.I.N. Contact] Hiring inquiry — Jordan / Example Company.”
The visitor’s name and contact details.
Connection type and selected topic.
Generated introduction.
All follow-up responses.
Submission timestamp.
A link to the CRM record, if available.
Use a verified sender address or the email service’s approved sending configuration. Set the visitor’s email as the reply-to address rather than spoofing the visitor as the sender.
6. User experience and accessibility
Show progress, such as “Step 2 of 5.”
Provide Back and Continue buttons.
Preserve all entered answers when navigating.
Support keyboard navigation and screen readers.
Label every input.
Provide clear inline validation messages.
Respect reduced-motion preferences.
Prevent cards and animations from blocking access to the form.
Make the entire experience usable on small screens.
Avoid forcing a visitor to restart if a validation or network error occurs.
Keep the experience concise; show conditional questions only when relevant.
7. Security, privacy, and anti-spam
Use server-side validation in addition to browser-side validation.
Add appropriate spam protection and rate limiting.
Do not log sensitive form contents unnecessarily.
Collect only the information needed to respond.
Link to the website’s actual privacy policy.
Store CRM credentials only in secure platform secrets or server-side configuration.
Avoid sending marketing emails unless the visitor has separately opted in and the relevant legal requirements are satisfied.
8. Analytics
Where analytics are available and properly configured, track:
Connection card selected.
Form started.
Step completed.
Form abandoned.
Validation error.
Successful submission.
Do not send the visitor’s name, email, or message content to analytics.
9. Final testing
Test each connection path, including:
All six cards.
Every conditional Other field.
Back and Continue behavior.
Required-field validation.
Invalid email handling.
Mobile layouts.
Keyboard and screen-reader basics.
Successful email notification.
Successful CRM creation or update.
CRM or email service failure.
Duplicate submission prevention.
Privacy acknowledgement.
Provide a final implementation summary identifying:
What works.
Which CRM and email provider are connected.
What configuration remains.
Which tests have passed.
Any known limitations.
Do not claim that the contact experience is production-ready until the actual email and CRM delivery paths have been tested end to end.

