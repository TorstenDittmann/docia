import { defineConfig } from "../src/index";

export default defineConfig({
	srcDir: "docs/book",
	outDir: "docs/dist",
	publicDir: "docs/public",
	basePath: "/",
	prettyUrls: true,
	site: {
		title: "docia",
		description: "Usage guide for building static documentation with docia.",
		language: "en",
		url: "https://docia.xyz/",
		socials: {
			github: "https://github.com/TorstenDittmann/docia",
			x: "https://x.com/dittmanntorsten",
		},
		githubEditBaseUrl: "https://github.com/TorstenDittmann/docia/edit/main/docs/book",
	},
});
