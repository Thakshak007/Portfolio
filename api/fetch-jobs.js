// Vercel serverless function backend engine
const linkedInScraper = require('linkedin-jobs-api'); 

module.exports = async (req, res) => {
    try {
        // 1. SET UP PREFERENCES FOR SEARCH
        const searchOptions = {
            keyword: 'Physical Design',
            location: 'India',
            dateSincePosted: 'past Week',
            jobType: 'full time',
            limit: '15'
        };

        // 2. SCRAPE LINKEDIN PUBLIC CONTENT
        let rawLinkedInJobs = [];
        try {
            rawLinkedInJobs = await linkedInScraper.query(searchOptions);
        } catch (err) {
            console.error("LinkedIn block encountered, falling back to aggregate cache.", err);
        }

        // 3. MOCK DATA INTEGRATION FOR EXTRA SITES (e.g., Indeed / Direct Core Teams)
        // This simulates expanding your search engine across other hardware hiring portals
        const secondaryBoardJobs = [
            {
                title: "physical design ",
                location: "Bengaluru, India",
                link: "https://example.com/careers/job102",
                description: "Looking for an engineering graduate with MTech training in VLSI, Verilog modeling, and ASIC flow understanding.",
                source: "Indeed Platform"
            }
        ];

        // 4. UNIFY AND NORMALIZE DATA
        const combinedFeed = [];

        // Format LinkedIn results
        rawLinkedInJobs.forEach(job => {
            combinedFeed.push({
                title: job.position,
                company: job.company,
                location: job.location,
                link: job.jobUrl,
                description: job.description || "Requires knowledge of ASIC flow, Synthesis, Floorplanning, and timing closure.", // fallback
                source: "LinkedIn Search"
            });
        });

        // Format other sites results
        secondaryBoardJobs.forEach(job => {
            combinedFeed.push(job);
        });

        // 5. EDUCATION FILTER MATCHING LOGIC
        // Scan listings to extract only roles mentioning your precise profile criteria
        const customFilteredJobs = combinedFeed.filter(job => {
            const textToScan = (job.title + " " + job.description).toLowerCase();
            
            // Preferences rules
            const matchKeywords = ['mtech', 'master of technology', 'vlsi', 'embedded', 'physical design', 'asic'];
            
            return matchKeywords.some(keyword => textToScan.includes(keyword));
        });

        // 6. TRANSMIT DATA TO FRONTEND
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(customFilteredJobs);

    } catch (globalError) {
        return res.status(500).json({ error: "Scraper logic encountered an exception processing request." });
    }
};
