export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    let processedMasterFeed = [];

    // ==========================================================
    // PIPELINE 1: Live LinkedIn Guest Engine (Fixed HTML Parsers)
    // ==========================================================
    try {
        // Broadened search query to pull physical design, VLSI trainees, and fresh hardware roles simultaneously
        const linkedinTargetUrl = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=Physical%20Design%20Trainee%20Fresher&location=India&f_TPR=r2592000&start=0';
        
        const liResponse = await fetch(linkedinTargetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache'
            }
        });

        if (liResponse.ok) {
            const rawHtmlChunk = await liResponse.text();
            
            // Split the raw string by the list item rows layout
            const rawCards = rawHtmlChunk.split('<li');
            
            for (let i = 1; i < rawCards.length; i++) {
                const cardHtml = rawCards[i];
                
                // FIXED PARSERS: Updated to target LinkedIn's live public guest card markers
                const titleMatch = cardHtml.match(/<h3 class="base-search-card__title">([\s\S]*?)<\/h3>/);
                const companyMatch = cardHtml.match(/<h4 class="base-search-card__subtitle">([\s\S]*?)<\/h4>/) || cardHtml.match(/<a class="hidden-nested-link"[\s\S]*?>([\s\S]*?)<\/a>/);
                const locationMatch = cardHtml.match(/<span class="job-search-card__location">([\s\S]*?)<\/span>/);
                const linkMatch = cardHtml.match(/<a class="base-card__full-link"[\s\S]*?href="([\s\S]*?)"/);

                if (titleMatch && linkMatch) {
                    const cleanTitle = titleMatch[1].trim();
                    const cleanCompany = companyMatch ? companyMatch[1].replace(/<[^>]*>/g, '').trim() : "Semiconductor Partner";
                    const cleanLocation = locationMatch ? locationMatch[1].trim() : "Bengaluru, India";
                    const cleanLink = linkMatch[1].split('?')[0]; // Clean out tracking analytics strings

                    processedMasterFeed.push({
                        title: cleanTitle,
                        company: cleanCompany,
                        location: cleanLocation,
                        link: cleanLink,
                        description: `Live recruitment vacancy open for application. Sourced from active tracking indices. Click apply to review specific screening pipelines, interview processing structures, and timeline constraints.`,
                        source: "LinkedIn Live Grid"
                    });
                }
            }
        }
    } catch (liError) {
        console.warn("LinkedIn guest stream safely caught or bypassed:", liError);
    }

    // ==========================================================
    // PIPELINE 2: Global Ecosystem Feed (HackerNews)
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
    // PIPELINE 3: Remote Hardware API (WeWorkRemotely)
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
    // CONSTRAINTS & KEYWORD MATCHING ENGINE (From Your Images)
    // ==========================================================
    const targetKeywords = [
        // Hardcore Engineering Domain Keywords
        'vlsi', 'physical design', 'asic', 'hardware', 'pcb', 'layout', 'circuit', 'dft',
        'sta', 'timing', 'synthesis', 'floorplanning', 'placement', 'cts', 'routing', 'cmos',
        // Real-world Image Constraints & Screening Criteria
        'fresher', 'trainee', 'junior', 'graduate', 'walk-in', 'drive', 'written test', '4 lpa'
    ];

    try {
        // Filter out unmatched software noise, keeping only your hardware target roles
        const filteredOutput = processedMasterFeed.filter(job => {
            const rawBlockText = ((job.title || '') + " " + (job.description || '')).toLowerCase();
            return targetKeywords.some(keyword => rawBlockText.includes(keyword.toLowerCase()));
        });

        // Fallback strategy: pass the raw payload if filters reduce the list to zero
        const finalPayload = filteredOutput.length > 0 ? filteredOutput : processedMasterFeed.slice(0, 15);
        
        return res.status(200).json(finalPayload);

    } catch (filterException) {
        console.error("Critical layer matching exception:", filterException);
        return res.status(200).json(processedMasterFeed.slice(0, 10));
    }
}
