export default {
	scripts: {
		install: ["hutch", "install", "--frozen-lockfile"],
		start: ["hutch", "electrobun", "dev"],
		dev: ["./scripts/dev.sh"],
	},
	electrobun: {
		version: "2.0.1",
	},
};
