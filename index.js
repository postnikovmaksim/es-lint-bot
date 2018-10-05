const { CLIEngine } = require('eslint');

// const linter = new CLIEngine({ fix: true });
const linter = new CLIEngine();

module.exports = app => {
    app.log('Yay, the app was loaded!');

    app.on([
        'pull_request.opened',
        'pull_request.synchronize'], async context => {
        const comments = [];

        const { data } = await context.github.pullRequests.getFiles({
            repo: context.repo().repo,
            owner: context.repo().owner,
            number: context.payload.number
        });
        
        for (let i = 0; i < data.length; i += 1) {
            const file = data[i];

            const responce = await context.github.gitdata.getBlob({
                file_sha: file.sha,
                repo: context.repo().repo,
                owner: context.repo().owner
            });

            const fileString = new Buffer(responce.data.content, 'base64').toString();
            const errors = linter.executeOnText(fileString);

            errors.results[0].messages.forEach(message => {
                comments.push({
                    body: `${message.message} ruleId: ${message.ruleId}`,
                    path: file.filename,
                    position: message.line
                });
            });
        }

        if (!comments.length) {
            return context.github.pullRequests.createReview({
                repo: context.repo().repo,
                owner: context.repo().owner,
                number: context.payload.number,
                event: 'APPROVE'
            });
        }

        context.github.pullRequests.createReview({
            body: 'Настрой себе ESlint https://confluence.mdtest.org/display/DEV/Code+quality+-+ESLint',
            repo: context.repo().repo,
            owner: context.repo().owner,
            number: context.payload.number,
            event: 'REQUEST_CHANGES',
            comments
        });
    });
};
