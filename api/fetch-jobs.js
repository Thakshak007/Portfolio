export default async function handler(req, res) {
    // Force cross-origin accessibility flags for clean browser communication
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    let processedMasterFeed = [];

    // ==========================================================
    // PIPELINE 1: Real-World Live LinkedIn Guest Engine 
    // ==========================================================
    try {
        // Querying LinkedIn's native search tunnel for Physical Design engineering in India
        const linkedinTargetUrl = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=Physical%20Design%20Engineer&location=India&f_TPR=r604800&start=0';
        
        const liResponse = await fetch(linkedinTargetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        if (liResponse.ok) {
            const rawHtmlChunk = await liResponse.text();
            
            // Parse individual structural card rows from the LinkedIn layout string
            const rawCards = rawHtmlChunk.split('<li');
            
            for (let i = 1; i < rawCards.length; i++) {
                const cardHtml = rawCards[i];
                
                // Track down matching tags for titles, companies, links, and locations
                const titleMatch = cardHtml.match(/<h3 class="base-search-card__title">([\s\S]*?)<\/h3>/);
                const companyMatch = cardHtml.match(/<a class="hidden-nested-link"[\s\S]*?>([\s\S]*?)<\/a>/) || cardHtml.match(/<h4 class="base-search-card__subtitle">([\s\S]*?)<\/h4>/);
                const locationMatch = cardHtml.match(/<span class="job-search-card__location">([\s\S]*?)<\/span>/);
                const linkMatch = cardHtml.match(/<a class="base-card__full-link"[\s\S]*?href="([\s\S]*?)"/);

                if (titleMatch && linkMatch) {
                    processedMasterFeed.push({
                        title: titleMatch[1].trim(),
                        company: companyMatch ? companyMatch[1].trim() : "Semiconductor Hiring Partner",
                        location: locationMatch ? locationMatch[1].trim() : "Bengaluru, India",
                        link: linkMatch[1].split('?')[0], // Strips tracking parameters out for clean linking
                        description: "Real-world live vacancy sourced from LinkedIn search registry index. Click apply to review full timeline benchmarks and profile requirements.",
                        source: "LinkedIn Live Index"
                    });
                }
            }
        }
    } catch (liError) {
        console.warn("LinkedIn guest stream throttled by rate limit filter.", liError);
    }

    // ==========================================================
    // PIPELINE 2: Global Startup Ecosystem Feed (HackerNews)
    // ==========================================================
    try {
        const hnResponse = await fetch('https://hnrss.org/jobs');
        if (hnResponse.ok) {
            const xmlText = await hnResponse.text();
            const segments = xmlText.split('<item>');
            
            for (let i = 1; i < segments.length; i++) {
                const chunk = segments[i];
                const titleRegex = chunk.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || chunk.match(/<title>([\s\S]*?)<\/title>/);
                const linkRegex = chunk.match(/<link>([\s\S]*?)<\/link>/);
                const descRegex = chunk.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || chunk.match(/<description>([\s\S]*?)<\/description>/);

                if (titleRegex && linkRegex) {
                    const rawTitle = titleRegex[1].trim();
                    let extractedCompany = "Deep Tech Venture";
                    let finalTitle = rawTitle;
                    
                    if (rawTitle.includes(' is hiring ')) {
                        const splitted = rawTitle.split(' is hiring ');
                        extractedCompany = splitted[0];
                        finalTitle = splitted[1];
                    }

                    processedMasterFeed.push({
                        title: finalTitle,
                        company: extractedCompany,
                        location: "Remote / International",
                        link: linkRegex[1].trim(),
                        description: descRegex ? descRegex[1].replace(/<[^>]*>/g, '').substring(0, 180) + "..." : "Technical vacancy listing details available online.",
                        source: "HackerNews Network Feed"
                    });
                }
            }
        }
    } catch (hnError) { console.warn("Tech RSS endpoint timed out.", hnError); }

    // ==========================================================
    // PIPELINE 3: Remote Hardware & Global API (WeWorkRemotely)
    // ==========================================================
    try {
        const wwrResponse = await fetch('https://weworkremotely.com/api/v1/posts');
        if (wwrResponse.ok) {
            const data = await wwrResponse.json();
            if (data && Array.isArray(data.jobs)) {
                data.jobs.slice(0, 25).forEach(job => {
                    processedMasterFeed.push({
                        title: job.title,
                        company: job.company,
                        location: job.candidate_required_location || "Remote Opportunity",
                        link: job.url,
                        description: job.description ? job.description.replace(/<[^>]*>/g, '').substring(0, 180) + "..." : "Click to view architectural tracking credentials.",
                        source: "WeWorkRemotely Portal Feed"
                    });
                });
            }
        }
    } catch (wwrError) { console.warn("Global WWR stream offline.", wwrError); }

    // ==========================================================
    // MULTI-SITE CRITERIA INTELLIGENT MATCHING LAYER
    // ==========================================================
    // These keywords screen your collective feeds so only relevant roles show up
    const trackingKeywords = [
        'vlsi', 'physical design', 'asic', 'hardware', 'pcb', 'layout', 'circuit',
        'sta', 'timing', 'synthesis', 'floorplanning', 'placement', 'cts', 'routing',
        'fresher', 'trainee', 'junior', 'graduate', 'engineer', 'developer'
    ];

    try {
        const filteredOutput = processedMasterFeed.filter(job => {
            const rawBlockText = ((job.title || '') + " " + (job.description || '')).toLowerCase();
            return trackingKeywords.some(keyword => rawBlockText.includes(keyword.toLowerCase()));
        });

        // Safe Fallback: If filter runs dry, present the 12 most fresh live entries directly
        const payloadToReturn = filteredOutput.length > 0 ? filteredOutput : processedMasterFeed.slice(0, 12);
        
        return res.status(200).json(payloadToReturn);

    } catch (filterException) {
        console.error("Critical layer matching exception:", filterException);
        return res.status(200).json(processedMasterFeed.slice(0, 10));
    }
}
