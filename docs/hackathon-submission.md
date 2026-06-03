# PlotLock Hackathon Submission

## Title of your project

PlotLock — Spoilerless IP Prediction Markets

## Describe what your project is

PlotLock is a spoilerless prediction market for story-based IP.

Fans can predict future outcomes of a comic, game, anime, novel, drama, or series without seeing what everyone else predicted. In normal prediction markets, early votes and live odds can spoil the story and cause later users to follow the crowd. PlotLock fixes this by sealing prediction data with CDR until the episode, chapter, quest, or finale is released.

A creator can open a market like “Who is the traitor in Episode 8?” or “Which ending will become canon?” Fans submit their predictions before the deadline. The app only shows public-safe information such as participant count, deadline, and prize pool. It does not show live vote distribution, prediction reasoning, or the final answer.

After the story is released, the creator closes the market. CDR then unlocks the sealed prediction vaults and the official outcome vault. Correct predictors can claim rewards, and the IP owner can access a post-reveal audience insight report.

The core principle is: **Predict the ending without seeing the crowd. Reveal only after the story does.**

## Describe how your project uses CDR

PlotLock uses CDR to keep spoiler-sensitive prediction data encrypted until the correct condition is met.

When a fan submits a prediction, the selected option, confidence score, salt, and reasoning are encrypted into a CDR vault. The smart contract stores only a commitment hash and a vault reference, not the actual selected option. This prevents other fans from seeing live vote distribution or copying early voters.

The creator also uploads an encrypted outcome proof, such as the correct answer, creator attestation, episode timestamp, or final answer JSON. This can use CDR encrypted file delivery: the file is encrypted client-side, stored off-chain, and unlocked only after the market is closed.

For IP-gated markets, PlotLock can connect each market to a Story IP Asset. A user must hold the required Story license token or Prediction Pass to participate, reveal, or access post-reveal data. After the episode is released, CDR verifies the read condition and allows authorized users to decrypt the prediction data and official outcome file.

PlotLock also creates a post-reveal data product: an encrypted audience insight report showing how fans predicted the story, which clues mattered, and how confidence changed over time. This turns spoiler-sensitive fan prediction data into a CDR-powered data marketplace for IP owners and studios.

## Demo video script

0:00 — Open PlotLock homepage. Show tagline: “Predict the ending without seeing the crowd.”

0:15 — Creator creates or opens a market:
- IP: Cyber Academy Episode 8
- Question: Who is the traitor?
- Options: Rina, Joon, Mira, No traitor

0:35 — Creator seals official outcome proof. Show CDR vault ID.

0:55 — Fan wallet submits a prediction. The app creates a sealed prediction vault and public commitment hash.

1:25 — Try to view live results. The app shows that CDR blocks the read condition to prevent spoilers and herding.

1:55 — Creator closes the market to simulate story release.

2:15 — CDR reveal decrypts the official answer and fan predictions.

2:40 — Show post-reveal insight report with vote distribution and top clue.

3:00 — Open GitHub repo and show the CDR integration boundary, mock vault code, and smart contract.

## Which track?

Best CDR App Track

## Was anything about CDR confusing, or was it easy to understand?

Overall, CDR was easy to understand once I understood the core mental model: encrypted data lives off-chain or inside a CDR vault, and decryption only happens when the read condition is satisfied.

The most confusing part was understanding the boundary between what CDR protects and what still needs to be designed carefully in the app. For example, CDR protects the encrypted prediction payload, but the app still has to make sure not to leak spoiler-sensitive metadata through smart contract events, public transaction data, or option-specific storage.

For PlotLock, this was an important lesson. We could not store the selected prediction option directly on-chain, because that would defeat the purpose of spoilerless predictions. Instead, we store only a commitment hash on-chain and put the actual selected option, confidence score, salt, and reasoning inside the CDR-encrypted payload.

The other confusing parts were understanding when to use simple CDR uploads versus encrypted file delivery, and how to correctly pass auxiliary data for read conditions such as license-gated access.

Once those pieces clicked, CDR felt very powerful. It makes it possible to build apps where private data is not just hidden by a backend server, but protected by programmable on-chain access conditions.

## Any feedback about building with CDR? Anything we can improve?

The biggest improvement would be more end-to-end example apps that show real product patterns, not only isolated SDK calls. For example, a complete Next.js or Vite starter showing encrypted file upload, CDR vault creation, Story IP Asset linking, license-gated reads, failed access states, and successful decryption would make it much easier for hackathon builders to move quickly.

It would also help to have more ready-made helper functions for common conditions, especially Story license-gated access. A helper like `conditions.storyLicense({ ipId, licenseTokenAddress })` would reduce manual encoding mistakes and make the developer experience smoother.

Clearer error messages would also be very useful. During development, it would help to know whether a failed read is caused by an invalid license token, wrong IP ID, wrong access auxiliary data, incorrect condition encoding, network issues, or validator/decryption issues.

For apps like PlotLock, I would also love to see a privacy best-practices guide. CDR protects encrypted data well, but developers still need to avoid leaking sensitive information through public metadata, contract events, filenames, option IDs, or predictable vault structures. A guide on “what CDR protects vs. what the app must not leak” would be extremely helpful.

Overall, CDR was exciting to build with because it enables a new category of apps: not just token-gated content, but condition-gated decryption for private IP, encrypted files, spoiler-sensitive data, and confidential marketplaces.
