/**
 * Leaderboard Manager - Gerencia exibição de rankings
 */

class Leaderboard {
    constructor(gameName) {
        this.gameName = gameName;
        this.currentPlayer = this.getCurrentPlayer();
    }

    /**
     * Obtém ou cria nome do jogador
     */
    getCurrentPlayer() {
        let player = localStorage.getItem('currentPlayer');
        
        if (!player) {
            player = prompt('🎮 Digite seu nome de jogador:', 'Jogador');
            if (player && player.trim()) {
                player = player.trim();
                localStorage.setItem('currentPlayer', player);
            } else {
                player = 'Anônimo';
            }
        }
        
        return player;
    }

    /**
     * Salva um novo recorde
     */
    async saveScore(score, level = 1, timePlayed = 0) {
        try {
            await gameDB.addRecord(this.currentPlayer, this.gameName, score, level, timePlayed);
            
            // Verifica se é recorde pessoal
            const personalBest = await gameDB.getPersonalBest(this.currentPlayer, this.gameName);
            const isNewBest = score >= personalBest;
            
            return {
                success: true,
                isNewBest: isNewBest,
                score: score,
                personalBest: personalBest
            };
        } catch (error) {
            console.error('Erro ao salvar pontuação:', error);
            return { success: false };
        }
    }

    /**
     * Mostra ranking em um elemento HTML
     */
    async displayRanking(containerId, limit = 10) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container não encontrado:', containerId);
            return;
        }

        const records = await gameDB.getTopRecords(this.gameName, limit);
        const stats = await gameDB.getGameStats(this.gameName);

        let html = `
            <div class="leaderboard-container">
                <h2 class="leaderboard-title">🏆 Top ${limit} - ${this.gameName}</h2>
        `;

        if (records.length === 0) {
            html += `
                <div class="no-records">
                    <p>Ainda não há recordes. Seja o primeiro!</p>
                </div>
            `;
        } else {
            html += `<div class="leaderboard-list">`;
            
            records.forEach((record, index) => {
                const position = index + 1;
                const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}º`;
                const isCurrentPlayer = record.player === this.currentPlayer;
                
                html += `
                    <div class="leaderboard-item ${isCurrentPlayer ? 'current-player' : ''}">
                        <span class="position">${medal}</span>
                        <span class="player-name">${record.player}</span>
                        <span class="score">${record.score.toLocaleString()} pts</span>
                        ${record.level > 1 ? `<span class="level">Nv.${record.level}</span>` : ''}
                    </div>
                `;
            });
            
            html += `</div>`;
        }

        // Estatísticas
        if (stats && stats.total_games > 0) {
            html += `
                <div class="stats-container">
                    <h3>📊 Estatísticas</h3>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">Partidas Jogadas</span>
                            <span class="stat-value">${stats.total_games}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Jogadores</span>
                            <span class="stat-value">${stats.total_players}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Recorde Máximo</span>
                            <span class="stat-value">${Math.round(stats.highest_score).toLocaleString()}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Média de Pontos</span>
                            <span class="stat-value">${Math.round(stats.average_score).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        html += `</div>`;
        container.innerHTML = html;
    }

    /**
     * Mostra recorde pessoal
     */
    async displayPersonalBest(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const personalBest = await gameDB.getPersonalBest(this.currentPlayer, this.gameName);
        
        container.innerHTML = `
            <div class="personal-best">
                <h3>🎯 Seu Recorde</h3>
                <p class="pb-score">${personalBest.toLocaleString()} pontos</p>
                <p class="pb-player">${this.currentPlayer}</p>
            </div>
        `;
    }

    /**
     * Troca o nome do jogador
     */
    changePlayer() {
        const newName = prompt('🎮 Digite seu novo nome:', this.currentPlayer);
        if (newName && newName.trim()) {
            this.currentPlayer = newName.trim();
            localStorage.setItem('currentPlayer', this.currentPlayer);
            return true;
        }
        return false;
    }
}

/**
 * Adiciona estilos CSS para o leaderboard
 */
function injectLeaderboardStyles() {
    if (document.getElementById('leaderboard-styles')) return;

    const styles = `
        <style id="leaderboard-styles">
            .leaderboard-container {
                background: var(--bg-card, #252b48);
                border-radius: 20px;
                padding: 30px;
                margin: 20px 0;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            }

            .leaderboard-title {
                font-family: 'Orbitron', sans-serif;
                text-align: center;
                color: var(--accent-primary, #00d9ff);
                margin-bottom: 25px;
                font-size: 2rem;
                text-transform: uppercase;
                letter-spacing: 2px;
            }

            .leaderboard-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
                margin-bottom: 30px;
            }

            .leaderboard-item {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 15px 20px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 12px;
                transition: all 0.3s ease;
                border: 2px solid transparent;
            }

            .leaderboard-item:hover {
                background: rgba(0, 217, 255, 0.1);
                border-color: var(--accent-primary, #00d9ff);
                transform: translateX(5px);
            }

            .leaderboard-item.current-player {
                background: rgba(0, 217, 255, 0.15);
                border-color: var(--accent-primary, #00d9ff);
                box-shadow: 0 0 20px rgba(0, 217, 255, 0.3);
            }

            .position {
                font-size: 1.5rem;
                font-weight: bold;
                min-width: 50px;
                text-align: center;
            }

            .player-name {
                flex: 1;
                font-size: 1.2rem;
                font-weight: 600;
                color: var(--text-primary, #ffffff);
            }

            .score {
                font-size: 1.3rem;
                font-weight: bold;
                color: var(--accent-primary, #00d9ff);
                font-family: 'Orbitron', monospace;
            }

            .level {
                font-size: 0.9rem;
                padding: 4px 10px;
                background: var(--accent-secondary, #7b2cbf);
                border-radius: 8px;
                font-weight: 600;
            }

            .no-records {
                text-align: center;
                padding: 40px;
                color: var(--text-secondary, #b8c5d6);
                font-size: 1.2rem;
            }

            .stats-container {
                margin-top: 30px;
                padding-top: 30px;
                border-top: 2px solid rgba(255, 255, 255, 0.1);
            }

            .stats-container h3 {
                text-align: center;
                color: var(--accent-primary, #00d9ff);
                margin-bottom: 20px;
                font-size: 1.5rem;
            }

            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px;
            }

            .stat-item {
                text-align: center;
                padding: 15px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 10px;
            }

            .stat-label {
                display: block;
                font-size: 0.9rem;
                color: var(--text-secondary, #b8c5d6);
                margin-bottom: 8px;
            }

            .stat-value {
                display: block;
                font-size: 1.8rem;
                font-weight: bold;
                color: var(--accent-primary, #00d9ff);
                font-family: 'Orbitron', monospace;
            }

            .personal-best {
                text-align: center;
                padding: 20px;
                background: rgba(0, 217, 255, 0.1);
                border-radius: 15px;
                border: 2px solid var(--accent-primary, #00d9ff);
            }

            .personal-best h3 {
                color: var(--accent-primary, #00d9ff);
                margin-bottom: 10px;
            }

            .pb-score {
                font-size: 2.5rem;
                font-weight: bold;
                color: var(--accent-primary, #00d9ff);
                font-family: 'Orbitron', monospace;
                margin: 10px 0;
            }

            .pb-player {
                color: var(--text-secondary, #b8c5d6);
                font-size: 1.1rem;
            }

            @media (max-width: 768px) {
                .leaderboard-item {
                    flex-wrap: wrap;
                    gap: 10px;
                }

                .score {
                    flex: 1 0 100%;
                    text-align: right;
                }
            }
        </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
}

// Injeta estilos automaticamente
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectLeaderboardStyles);
} else {
    injectLeaderboardStyles();
}
