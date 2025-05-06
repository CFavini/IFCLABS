// Simulação dos dados que você tem nas pastas
const projectSamplesPath = 'Project_Samples'; // Ou o caminho que você usou
const projectsData = {
    "Duto_Rigido_001": {
        metadata: { /* Conteúdo do seu metadata.json para Duto_Rigido_001 */ },
        tabs: {
            "identificacao.csv": [ /* Array de arrays ou array de objetos do seu identificacao.csv */ ],
            "secoes_do_duto.csv": [ /* Conteúdo do seu secoes_do_duto.csv */ ]
        },
        comments: [ /* Conteúdo do seu comments.json */ ]
    }
    // Adicione mais projetos se tiver
};

function listProjects() {
    const projectListDiv = document.getElementById('project-list');
    // Limpa lista anterior
    projectListDiv.innerHTML = '';
    Object.keys(projectsData).forEach(projectName => {
        const projectButton = document.createElement('button');
        projectButton.textContent = projectName;
        projectButton.onclick = () => loadProject(projectName);
        projectListDiv.appendChild(projectButton);
    });
}

function loadProject(projectName) {
    const project = projectsData[projectName];
    document.getElementById('document-viewer').style.display = 'block'; // Torna visível
    // Exibir nome do projeto, etc.

    const tabButtonsDiv = document.getElementById('tab-buttons');
    tabButtonsDiv.innerHTML = ''; // Limpa abas anteriores

    project.metadata.tabs.forEach(tabInfo => {
        const tabButton = document.createElement('button');
        tabButton.textContent = tabInfo.name;
        tabButton.onclick = () => loadTabData(projectName, tabInfo.sourceFile, project.tabs[tabInfo.sourceFile], project.comments);
        tabButtonsDiv.appendChild(tabButton);
    });

    // Opcional: Carregar a primeira aba por padrão
    if (project.metadata.tabs.length > 0) {
        const firstTab = project.metadata.tabs[0];
        loadTabData(projectName, firstTab.sourceFile, project.tabs[firstTab.sourceFile], project.comments);
    }
}

function parseCSV(csvContentAsString) {
    // Função simples para converter string CSV em array de arrays
    // CUIDADO: Esta é uma implementação MUITO básica, não lida com aspas complexas ou outros casos.
    // Para o MVP, assuma um CSV simples.
    const lines = csvContentAsString.trim().split('\n');
    return lines.map(line => line.split(','));
}

function loadTabData(projectName, tabSourceFile, tabCsvContent, commentsData) {
    const dataTableContainer = document.getElementById('data-table-container');
    dataTableContainer.innerHTML = ''; // Limpa tabela anterior

    // Se você colou o CSV como string, precisará de uma função para parseá-lo
    // Se você colou como array de arrays, pode usar diretamente
    // Exemplo: const dataRows = parseCSV(tabCsvContent);
    const dataRows = Array.isArray(tabCsvContent) ? tabCsvContent : parseCSV(tabCsvContent);


    const table = document.createElement('table');
    table.border = "1"; // Estilo básico

    // Cabeçalho
    if (dataRows.length > 0) {
        const headerRow = table.insertRow();
        dataRows[0].forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
    }

    // Dados
    for (let i = 1; i < dataRows.length; i++) {
        const dataRow = table.insertRow();
        const rowId = dataRows[i][0]; // Assumindo que _RowID é a primeira coluna

        dataRows[i].forEach((cellText, cellIndex) => {
            const cell = dataRow.insertCell();
            cell.textContent = cellText;

            // Opcional MVP: Verificar e marcar comentários
            // Isso é uma lógica simplificada
            if (commentsData) {
                const columnHeader = dataRows[0][cellIndex];
                const hasComment = commentsData.some(commentPoint =>
                    commentPoint.tabId === projectData[projectName].metadata.tabs.find(t => t.sourceFile === tabSourceFile).id && // Compara tabId
                    commentPoint.cellCoordinates.rowId === rowId &&
                    commentPoint.cellCoordinates.columnHeader === columnHeader
                );
                if (hasComment) {
                    cell.style.backgroundColor = 'yellow'; // Indicação visual simples
                    cell.title = 'Esta célula possui comentários';
                }
            }
        });
    }
    dataTableContainer.appendChild(table);
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    listProjects();
    document.getElementById('document-viewer').style.display = 'none'; // Esconde inicialmente
});