/**
 * Database Manager - SQLite no navegador usando sql.js
 * Gerencia recordes e estatísticas dos jogos
 */

class GameDatabase {
    constructor() {
        this.db = null;
        this.SQL = null;
    }

    /**
     * Inicializa o banco de dados
     */
    async init() {
        try {
            // Carrega o SQL.js
            const SQL = await initSqlJs({
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
            });
            this.SQL = SQL;

            // Tenta carregar banco existente do localStorage
            const savedDb = localStorage.getItem('gameDatabase');
            
            if (savedDb) {
                // Restaura banco existente
                const uint8Array = new Uint8Array(JSON.parse(savedDb));
                this.db = new SQL.Database(uint8Array);
                console.log('✅ Banco de dados carregado!');
            } else {
                // Cria novo banco
                this.db = new SQL.Database();
                this.createTables();
                console.log('✅ Novo banco de dados criado!');
            }

            return true;
        } catch (error) {
            console.error('❌ Erro ao inicializar banco:', error);
            return false;
        }
    }

    /**
     * Cria as tabelas do banco
     */
    createTables() {
        // Tabela de jogadores
        this.db.run(`
            CREATE TABLE IF NOT EXISTS players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabela de recordes
        this.db.run(`
            CREATE TABLE IF NOT EXISTS records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                game_name TEXT NOT NULL,
                score INTEGER NOT NULL,
                level INTEGER DEFAULT 1,
                time_played INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (player_id) REFERENCES players(id)
            )
        `);

        // Índices para melhor performance
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_records_game ON records(game_name)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_records_score ON records(score DESC)`);

        this.save();
    }

    /**
     * Salva o banco no localStorage
     */
    save() {
        if (!this.db) return;
        
        const data = this.db.export();
        const buffer = JSON.stringify(Array.from(data));
        localStorage.setItem('gameDatabase', buffer);
    }

    /**
     * Adiciona ou busca um jogador
     */
    getOrCreatePlayer(playerName) {
        try {
            // Busca jogador existente
            let result = this.db.exec(
                'SELECT id FROM players WHERE name = ?',
                [playerName]
            );

            if (result.length > 0 && result[0].values.length > 0) {
                return result[0].values[0][0]; // Retorna ID
            }

            // Cria novo jogador
            this.db.run('INSERT INTO players (name) VALUES (?)', [playerName]);
            this.save();

            // Busca ID do novo jogador
            result = this.db.exec('SELECT last_insert_rowid()');
            return result[0].values[0][0];
        } catch (error) {
            console.error('❌ Erro ao gerenciar jogador:', error);
            return null;
        }
    }

    /**
     * Adiciona um novo recorde
     */
    addRecord(playerName, gameName, score, level = 1, timePlayed = 0) {
        try {
            const playerId = this.getOrCreatePlayer(playerName);
            
            if (!playerId) {
                throw new Error('Não foi possível criar/encontrar jogador');
            }

            this.db.run(
                `INSERT INTO records (player_id, game_name, score, level, time_played) 
                 VALUES (?, ?, ?, ?, ?)`,
                [playerId, gameName, score, level, timePlayed]
            );

            this.save();
            console.log('✅ Recorde salvo!');
            return true;
        } catch (error) {
            console.error('❌ Erro ao salvar recorde:', error);
            return false;
        }
    }

    /**
     * Busca top recordes de um jogo
     */
    getTopRecords(gameName, limit = 10) {
        try {
            const result = this.db.exec(`
                SELECT 
                    p.name as player,
                    r.score,
                    r.level,
                    r.time_played,
                    r.created_at
                FROM records r
                JOIN players p ON r.player_id = p.id
                WHERE r.game_name = ?
                ORDER BY r.score DESC
                LIMIT ?
            `, [gameName, limit]);

            if (result.length === 0) return [];

            // Converte resultado em array de objetos
            const columns = result[0].columns;
            return result[0].values.map(row => {
                const obj = {};
                columns.forEach((col, i) => {
                    obj[col] = row[i];
                });
                return obj;
            });
        } catch (error) {
            console.error('❌ Erro ao buscar recordes:', error);
            return [];
        }
    }

    /**
     * Busca recorde pessoal de um jogador em um jogo
     */
    getPersonalBest(playerName, gameName) {
        try {
            const result = this.db.exec(`
                SELECT MAX(r.score) as best_score
                FROM records r
                JOIN players p ON r.player_id = p.id
                WHERE p.name = ? AND r.game_name = ?
            `, [playerName, gameName]);

            if (result.length === 0 || !result[0].values[0][0]) {
                return 0;
            }

            return result[0].values[0][0];
        } catch (error) {
            console.error('❌ Erro ao buscar recorde pessoal:', error);
            return 0;
        }
    }

    /**
     * Estatísticas gerais de um jogo
     */
    getGameStats(gameName) {
        try {
            const result = this.db.exec(`
                SELECT 
                    COUNT(*) as total_games,
                    COUNT(DISTINCT player_id) as total_players,
                    MAX(score) as highest_score,
                    AVG(score) as average_score
                FROM records
                WHERE game_name = ?
            `, [gameName]);

            if (result.length === 0) return null;

            const columns = result[0].columns;
            const values = result[0].values[0];
            const stats = {};
            
            columns.forEach((col, i) => {
                stats[col] = values[i];
            });

            return stats;
        } catch (error) {
            console.error('❌ Erro ao buscar estatísticas:', error);
            return null;
        }
    }

    /**
     * Limpa todos os dados (use com cuidado!)
     */
    clearAllData() {
        if (confirm('⚠️ Tem certeza que deseja limpar TODOS os recordes?')) {
            this.db.run('DELETE FROM records');
            this.db.run('DELETE FROM players');
            this.save();
            console.log('🗑️ Dados limpos!');
            return true;
        }
        return false;
    }

    /**
     * Exporta dados para JSON (backup)
     */
    exportToJSON() {
        try {
            const players = this.db.exec('SELECT * FROM players');
            const records = this.db.exec('SELECT * FROM records');

            const data = {
                players: this.resultToJSON(players),
                records: this.resultToJSON(records),
                exported_at: new Date().toISOString()
            };

            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('❌ Erro ao exportar:', error);
            return null;
        }
    }

    /**
     * Converte resultado SQL em JSON
     */
    resultToJSON(result) {
        if (!result || result.length === 0) return [];
        
        const columns = result[0].columns;
        return result[0].values.map(row => {
            const obj = {};
            columns.forEach((col, i) => {
                obj[col] = row[i];
            });
            return obj;
        });
    }
}

// Instância global do banco
const gameDB = new GameDatabase();
