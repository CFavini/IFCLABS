// script.js - Versão com fetch()

document.addEventListener('DOMContentLoaded', async () => {
    // --- Verificação de Token (Simulação) ---
    const authToken = sessionStorage.getItem('ifclabsAuthToken');
    const expectedTokenPrefix = "MVP_TOKEN_IFCLABS_";
    if (!authToken || !authToken.startsWith(expectedTokenPrefix)) {
        alert('Acesso não autorizado ou sessão expirada. Por favor, faça login.');
        window.location.replace('index.html'); // Ou o nome da sua página de login
        return; // Impede a execução do restante do script
    }
    const loggedInUser = sessionStorage.getItem('ifclabsUser');
    if (loggedInUser) {
        console.log('Usuário logado (simulado):', loggedInUser);
        // Ex: document.getElementById('user-greeting').textContent = `Bem-vindo, ${loggedInUser}!`;
    }
    // --- Fim da Verificação de Token ---

    // Nomes das pastas dos seus projetos de exemplo.
    // No futuro, isso pode ser lido de um arquivo de configuração ou descoberto dinamicamente.
    const projectFolderNames = ["Duto_Rigido_001"]; // Adicione mais nomes de pastas de projetos aqui se tiver

    // Objeto global para armazenar os dados dos projetos carregados
    window.projectsData = {};

    async function fetchProjectData(folderName) {
        try {
            // Ajuste o caminho base se a sua pasta Project_Samples estiver em outro lugar em relação ao script.js/html
            const basePath = `./Project_Samples/${folderName}`;

            const metadataResponse = await fetch(`${basePath}/metadata.json`);
            if (!metadataResponse.ok) throw new Error(`Falha ao carregar metadata.json para ${folderName}`);
            const metadata = await metadataResponse.json();

            const commentsResponse = await fetch(`${basePath}/comments.json`);
            if (!commentsResponse.ok) throw new Error(`Falha ao carregar comments.json para ${folderName}`);
            const comments = await commentsResponse.json();

            const tabsData = {};
            if (metadata.tabs && metadata.tabs.length > 0) {
                for (const tabInfo of metadata.tabs) {
                    if (tabInfo.sourceFile) {
                        const csvResponse = await fetch(`${basePath}/${tabInfo.sourceFile}`);
                        if (!csvResponse.ok) throw new Error(`Falha ao carregar ${tabInfo.sourceFile} para ${folderName}`);
                        tabsData[tabInfo.sourceFile] = await csvResponse.text(); // Carrega CSV como texto
                    } else {
                        console.warn(`Aba "${tabInfo.name}" no metadata de ${folderName} não tem sourceFile definido.`);
                    }
                }
            }
            return { metadata, tabsData, comments };
        } catch (error) {
            console.error(`Erro ao carregar dados para o projeto ${folderName}:`, error);
            return null; // Retorna null para indicar falha no carregamento deste projeto
        }
    }

    // Carrega todos os projetos
    for (const folderName of projectFolderNames) {
        const data = await fetchProjectData(folderName);
        if (data) {
            window.projectsData[folderName] = data;
        }
    }

    // Após carregar os dados, inicializa a interface
    if (Object.keys(window.projectsData).length > 0) {
        listProjects();
        document.getElementById('document-viewer').style.display = 'none';
    } else {
        const projectListDiv = document.getElementById('project-list');
        if (projectListDiv) { // Verifica se o elemento existe
            projectListDiv.innerHTML = "<p>Nenhum dado de projeto pôde ser carregado. Verifique o console para erros (F12).</p>";
        } else {
            console.error("Elemento 'project-list' não encontrado no DOM.");
        }
    }
});


function listProjects() {
    const projectListDiv = document.getElementById('project-list');
    if (!projectListDiv) return;
    projectListDiv.innerHTML = '';

    Object.keys(window.projectsData).forEach(projectName => {
        const projectButton = document.createElement('button');
        projectButton.textContent = projectName;
        projectButton.onclick = (event) => {
            document.querySelectorAll('#project-list button.active').forEach(btn => btn.classList.remove('active'));
            event.currentTarget.classList.add('active');
            loadProject(projectName);
        }
        projectListDiv.appendChild(projectButton);
    });
}

function loadProject(projectName) {
    const project = window.projectsData[projectName];
    if (!project || !project.metadata) {
        console.error("Dados do projeto ou metadados não encontrados para:", projectName);
        // Poderia exibir uma mensagem de erro na UI aqui
        document.getElementById('document-title').textContent = `Erro ao carregar ${projectName}`;
        document.getElementById('tab-buttons').innerHTML = '';
        document.getElementById('data-table-container').innerHTML = '';
        document.getElementById('doc-comments-list').innerHTML = '';
        return;
    }

    document.getElementById('document-viewer').style.display = 'block';
    document.getElementById('document-title').textContent = project.metadata.documentName || projectName;

    document.getElementById('meta-created-by').textContent = project.metadata.createdBy || 'N/A';
    document.getElementById('meta-created-at').textContent = project.metadata.createdAt ? new Date(project.metadata.createdAt).toLocaleString() : 'N/A';
    document.getElementById('meta-last-modified-by').textContent = project.metadata.lastModifiedBy || 'N/A';
    document.getElementById('meta-last-modified-at').textContent = project.metadata.lastModifiedAt ? new Date(project.metadata.lastModifiedAt).toLocaleString() : 'N/A';

    const docCommentsList = document.getElementById('doc-comments-list');
    docCommentsList.innerHTML = '';
    if (project.metadata.documentComments && project.metadata.documentComments.length > 0) {
        project.metadata.documentComments.forEach(comment => {
            const listItem = document.createElement('li');
            listItem.textContent = `(${new Date(comment.timestamp).toLocaleTimeString()}) ${comment.user}: ${comment.text}`;
            docCommentsList.appendChild(listItem);
        });
    } else {
        docCommentsList.innerHTML = '<li>Nenhum comentário geral para este documento.</li>';
    }

    const tabButtonsDiv = document.getElementById('tab-buttons');
    tabButtonsDiv.innerHTML = '';
    document.getElementById('current-tab-name').textContent = '';
    document.getElementById('data-table-container').innerHTML = '';

    if (project.metadata.tabs && project.metadata.tabs.length > 0) {
        project.metadata.tabs.forEach((tabInfo, index) => {
            const tabButton = document.createElement('button');
            tabButton.textContent = tabInfo.name;
            tabButton.dataset.tabFile = tabInfo.sourceFile;

            tabButton.onclick = (event) => {
                document.querySelectorAll('#tab-buttons button.active').forEach(btn => btn.classList.remove('active'));
                event.currentTarget.classList.add('active');
                const tabCsvString = project.tabsData[tabInfo.sourceFile];
                loadTabData(projectName, tabInfo, tabCsvString, project.comments);
            }
            tabButtonsDiv.appendChild(tabButton);

            if (index === 0) {
                tabButton.classList.add('active');
                const firstTabCsvString = project.tabsData[tabInfo.sourceFile];
                loadTabData(projectName, tabInfo, firstTabCsvString, project.comments);
            }
        });
    } else {
        document.getElementById('current-tab-name').textContent = 'Nenhuma aba definida para este documento.';
    }
}

function parseCSV(csvString) {
    if (typeof csvString !== 'string') {
        console.error("parseCSV: input is not a string", csvString);
        return [];
    }
    const lines = csvString.trim().split(/\r?\n/);
    return lines.map(line => line.split(',')); // Simples split. Para CSVs complexos, usar biblioteca.
}

function loadTabData(projectName, tabInfo, tabCsvString, projectCellComments) {
    document.getElementById('current-tab-name').textContent = `Dados da Aba: ${tabInfo.name}`;
    const dataTableContainer = document.getElementById('data-table-container');
    dataTableContainer.innerHTML = '';

    if (typeof tabCsvString !== 'string' || tabCsvString.trim() === '') {
        dataTableContainer.innerHTML = `<p>Conteúdo da aba "${tabInfo.name}" está vazio ou não foi carregado corretamente.</p>`;
        return;
    }

    const dataRows = parseCSV(tabCsvString);
    const table = document.createElement('table');

    if (dataRows.length > 0) {
        const headerRow = table.createTHead().insertRow();
        const columnHeaders = dataRows[0].map(headerText => headerText.trim());
        columnHeaders.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });

        const tbody = table.createTBody();
        for (let i = 1; i < dataRows.length; i++) {
            if (dataRows[i].join('').trim() === '') continue;

            const dataRowEl = tbody.insertRow();
            const rowId = dataRows[i][0] ? dataRows[i][0].trim() : `generated-rowid-${i}`;

            dataRows[i].forEach((cellText, cellIndex) => {
                const cell = dataRowEl.insertCell();
                cell.textContent = cellText.trim();

                if (projectCellComments && projectCellComments.length > 0 && cellIndex < columnHeaders.length) {
                    const columnHeader = columnHeaders[cellIndex];
                    const hasComment = projectCellComments.some(commentPoint =>
                        commentPoint.tabId === tabInfo.id &&
                        commentPoint.cellCoordinates.rowId === rowId &&
                        commentPoint.cellCoordinates.columnHeader === columnHeader
                    );
                    if (hasComment) {
                        cell.classList.add('has-comment');
                        let commentDetails = "Comentários:\n";
                        projectCellComments.filter(c => c.tabId === tabInfo.id && c.cellCoordinates.rowId === rowId && c.cellCoordinates.columnHeader === columnHeader)
                            .forEach(cPoint => {
                                cPoint.threads.forEach(thread => {
                                    thread.entries.forEach(entry => {
                                        commentDetails += `- ${entry.user} (${new Date(entry.timestamp).toLocaleTimeString()}): ${entry.commentText} [${entry.type}]\n`;
                                    });
                                });
                            });
                        cell.title = commentDetails;
                    }
                }
            });
        }
    } else {
        dataTableContainer.innerHTML = "<p>Nenhum dado para exibir nesta aba (após o cabeçalho).</p>";
    }
    dataTableContainer.appendChild(table);
}