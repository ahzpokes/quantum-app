import { NextResponse } from 'next/server';

export async function POST() {
    const GITHUB_PAT = process.env.GITHUB_PAT;
    const REPO_OWNER = 'ahzpokes';
    const REPO_NAME = 'quantum-app';
    const WORKFLOW_FILE = 'risk_parity.yml';

    if (!GITHUB_PAT) {
        return NextResponse.json(
            { error: 'Token GitHub (GITHUB_PAT) manquant dans les variables d\'environnement.' },
            { status: 400 }
        );
    }

    try {
        const response = await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GITHUB_PAT}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ref: 'master', // Branch to run on
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { error: `Erreur GitHub: ${response.status} ${response.statusText}`, details: errorText },
                { status: response.status }
            );
        }

        return NextResponse.json({ message: 'Action GitHub déclenchée avec succès !' });
    } catch (err) {
        console.error('Trigger error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
