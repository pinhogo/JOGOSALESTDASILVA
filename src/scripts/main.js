// Animação sequencial dos cards
document.addEventListener('DOMContentLoaded', function() {
    const cards = document.querySelectorAll('.game-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
});

// Previne o comportamento padrão do botão dentro do card clicável
document.querySelectorAll('.play-button').forEach(button => {
    button.addEventListener('click', function(e) {
        e.stopPropagation();
    });
});
