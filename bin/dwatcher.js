#!/usr/bin/env node

import { createCLI } from "../src";

const cli = createCLI();
cli.run(process.argv).catch(err => {
    console.error(`\x1b[31m[dwatcher]\x1b[0m ${err.message}`);
    process.exit(1);
});
