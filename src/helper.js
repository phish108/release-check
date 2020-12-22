const protected_defaults = [
    ".github/",
    "tests/",
    "test/",
    ".gitignore"
];

function prepareProtectedPaths(extraString) {
    let extraPaths = [];

    if (typeof extraString === "string") {
        extraPaths = extraString.split(/[\s\n\r]+/);
    }

    if (protected_defaults) {
        extraPaths = protected_defaults.concat(extraPaths);
    }

    return extraPaths;
}

function _reduceOr(value, carry) {
    return value || carry;
}

function _reduceAnd(value, carry) {
    return value && carry;
}

function checkItemInArrayPattern(item, patterns) {
    let is_in_path = patterns.map((pattern) => item.startsWith(pattern));

    return is_in_path.reduce(_reduceOr, false);
}

function itemsInArray(items, array) {
    return items
        .filter((item) => array.includes(item))
        .length;
}

function checkItemsInArray(items, array, all = false) {
    const nItems = itemsInArray(items, array);

    if (all) {
        return nItems === items.length;
    }

    return nItems > 0;
}

function checkOnlyPaths(fileNames, paths) {
    let is_path = fileNames.map((file) => checkItemInArrayPattern(file, paths));

    return is_path.reduce(_reduceAnd, true);
}

function checkNpmFiles(fileNames) {
    const paths = [
        "package.json",
        "package-lock.json"
    ];

    return checkItemsInArray(fileNames, paths);
}

function checkOnlyHoldPaths(fileNames, paths) {
    paths = paths.concat([
        "package.json",
        "package-lock.json"
    ]);

    return checkOnlyPaths(fileNames, paths);
}

function prepareJsonDiff(diffString) {
    const changes = diffString.split("\n");

    return changes
        .filter((change) => change.match(/^[+-]\s*"/))
        .map((change) => change.replace(/^[+-]\s*"([^"]+).*$/, "$1"));
}

function extractDevDependencies(packageJSON) {
    if ( typeof packageJSON === "string" ) {
        packageJSON = JSON.parse(packageJSON);
    }

    if (! packageJSON || ! packageJSON.devDependencies) {
        return [];
    }

    return Object.keys(packageJSON.devDependencies);
}

function checkChangesOnlyInDevDependencies(diff, packageJSON) {
    const changes      = prepareJsonDiff(diff);
    const dependencies = extractDevDependencies(packageJSON);

    return checkItemsInArray(changes, dependencies, true);
}

async function checkCommits(github, context, extras) {
    const base = context.payload.before;
    const head = context.payload.after;
    const owner = context.repo.owner.name;
    const repo = context.repo.name;

    console.log(JSON.stringify(context, null, "  "));
    console.log(`owner ${owner} repo ${repo}`);
    console.log(`before ${base}`);
    console.log(`after ${head}`);

    const changeLog = await github.repos.compareCommits({
        owner,
        repo,
        base,
        head
    });

    const files = changeLog.data.files
        .map(file => file.filename);

    let protectedExtra = "";

    if ( extras &&
         extras.protected_extra &&
         typeof extras.protected_extra === "string" ) {
        protectedExtra = extras.protected_extra;
    }

    const protected_paths = prepareProtectedPaths(protected_defaults,
                                                  protectedExtra);

    // check normal protected files
    let hold_protected = checkOnlyPaths(files,
                                        protected_paths);

    // check if package files changed
    const hold_package = checkNpmFiles(files);

    let hold_development = false;

    if (hold_package) {
        const pInfo = changeLog.data.files
            .filter((file) => file.filename === "package.json");

        const pFile = await github.request(pInfo[0].raw_url);

        hold_development = checkChangesOnlyInDevDependencies(pInfo[0].patch,
                                                             pFile.data);
    }

    if (hold_development) {
        hold_protected = checkOnlyHoldPaths(files, protected_paths);
    }

    return {
        hold_development,
        hold_protected,
        proceed: !hold_protected
    };
}

module.exports = {
    checkCommits,
    prepareProtectedPaths,
    checkOnlyPaths,
    checkOnlyHoldPaths,
    checkNpmFiles,
    checkChangesOnlyInDevDependencies,
    prepareJsonDiff
};


