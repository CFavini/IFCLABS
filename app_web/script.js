// script.js - Versão com fetch() para IFCLABS MVP (arquivos na raiz do repositório)

document.addEventListener('DOMContentLoaded', async () => {
    // --- Verificação de Token (Simulação) ---
    const authToken = sessionStorage.getItem('ifclabsAuthToken');
    const expectedTokenPrefix = "MVP_TOKEN_IFCLABS_";

    if (window.location.pathname.endsWith('lista.html') || window.location.pathname.endsWith('/lista.html')) { // Considera a barra no final
        if (!authToken || !authToken.startsWith(expectedTokenPrefix)) {
            alert('Acesso não autorizado ou sessão expirada. Por favor, faça login.');
            window.location.replace('index.html');
            return;
        }
        const loggedInUser = sessionStorage.getItem('ifclabsUser');
        if (loggedInUser) {
            console.log('Usuário logado (simulado):', loggedInUser);
            const userGreetingElement = document.getElementById('user-greeting');
            if (userGreetingElement) {
                userGreetingElement.textContent = `Usuário: ${loggedInUser}`;
            }
        }
    }
    // --- Fim da Verificação de Token ---

    if (window.location.pathname.endsWith('lista.html') || window.location.pathname.endsWith('/lista.html')) {
        const projectFolderNames = ["Duto_Rigido_001"];
        window.projectsData = {};

        async function fetchProjectData(folderName) {
            try {
                // CAMINHO AJUSTADO PARA ARQUIVOS NA RAIZ:
                //const basePath = `./Project_Samples/${folderName}`;
                const basePath = `./Project_Samples/${folderName}`;

                // Adicionando um timestamp para tentar evitar cache em testes
                const noCache = `?v=${new Date().getTime()}`;

                const metadataResponse = await fetch(`<span class="math-inline">\{basePath\}/metadata\.json</span>{noCache}`);
                if (!metadataResponse.ok) throw new Error(`Falha ao carregar metadata.json para ${folderName} (Status: ${metadataResponse.status}) URL: ${metadataResponse.url}`);
                const metadata = await metadataResponse.json();

                const commentsResponse = await fetch(`<span class="math-inline">\{basePath\}/comments\.json</span>{noCache}`);
                if (!commentsResponse.ok) throw new Error(`Falha ao carregar comments.json para ${folderName} (Status: ${commentsResponse.status}) URL: ${commentsResponse.url}`);
                const comments = await commentsResponse.json();

                const tabsData = {};
                if (metadata.tabs && metadata.tabs.length > 0) {
                    for (const tabInfo of metadata.tabs) {
                        if (tabInfo.sourceFile) {
                            const csvResponse = await fetch(`<span class="math-inline">\{basePath\}/</span>{tabInfo.sourceFile}${noCache}`);
                            if (!csvResponse.ok) throw new Error(`Falha ao carregar ${tabInfo.sourceFile} para ${folderName} (Status: ${csvResponse.status}) URL: ${csvResponse.url}`);
                            tabsData[tabInfo.sourceFile] = await csvResponse.text();
                        } else {
                            console.warn(`Aba "${tabInfo.name}" no metadata de ${folderName} não tem sourceFile definido.`);
                            tabsData[tabInfo.sourceFile || tabInfo.name] = "";
                        }
                    }
                }
                return { metadata, tabsData, comments };
            } catch (error) {
                console.error(`Erro ao carregar dados para o projeto ${folderName}:`, error);
                const projectListDiv = document.getElementById('project-list');
                if (projectListDiv) {
                    const errorItem = document.createElement('p');
                    errorItem.textContent = `Erro ao carregar ${folderName}: ${error.message}`;
                    errorItem.style.color = 'red';
                    projectListDiv.appendChild(errorItem);
                }
                return null;
            }
        }

        for (const folderName of projectFolderNames) {
            const data = await fetchProjectData(folderName);
            if (data) {
                window.projectsData[folderName] = data;
            }
        }

        if (Object.keys(window.projectsData).length > 0) {
            listProjects();
            const docViewer = document.getElementById('document-viewer');
            if(docViewer) docViewer.style.display = 'none';
        } else {
            const projectListDiv = document.getElementById('project-list');
            if (projectListDiv) {
                projectListDiv.innerHTML = "<p>Nenhum dado de projeto pôde ser carregado. Verifique o console (F12) para erros, e os caminhos dos arquivos de dados.</p>";
            }
        }
    }
});


function listProjects() {
    const projectListDiv = document.getElementById('project-list');
    if (!projectListDiv || !window.projectsData) return;
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
        const docTitle = document.getElementById('document-title');
        if (docTitle) docTitle.textContent = `Erro ao carregar ${projectName}`;
        const tabButtonsDiv = document.getElementById('tab-buttons');
        if (tabButtonsDiv) tabButtonsDiv.innerHTML = '';
        const dataTableContainer = document.getElementById('data-table-container');
        if (dataTableContainer) dataTableContainer.innerHTML = '';
        const docCommentsList = document.getElementById('doc-comments-list');
        if (docCommentsList) docCommentsList.innerHTML = '';
        return;
    }

    const docViewer = document.getElementById('document-viewer');
    if(docViewer) docViewer.style.display = 'block';

    const docTitle = document.getElementById('document-title');
    if(docTitle) docTitle.textContent = project.metadata.documentName || projectName;

    const metaCreatedBy = document.getElementById('meta-created-by');
    if(metaCreatedBy) metaCreatedBy.textContent = project.metadata.createdBy || 'N/A';
    const metaCreatedAt = document.getElementById('meta-created-at');
    if(metaCreatedAt) metaCreatedAt.textContent = project.metadata.createdAt ? new Date(project.metadata.createdAt).toLocaleString() : 'N/A';
    const metaLastModifiedBy = document.getElementById('meta-last-modified-by');
    if(metaLastModifiedBy) metaLastModifiedBy.textContent = project.metadata.lastModifiedBy || 'N/A';
    const metaLastModifiedAt = document.getElementById('meta-last-modified-at');
    if(metaLastModifiedAt) metaLastModifiedAt.textContent = project.metadata.lastModifiedAt ? new Date(project.metadata.lastModifiedAt).toLocaleString() : 'N/A';

    const docCommentsList = document.getElementById('doc-comments-list');
    if(docCommentsList) {
        docCommentsList.innerHTML = '';
        if (project.metadata.documentComments && project.metadata.documentComments.length > 0) {
            project.metadata.documentComments.forEach(comment => {
                const listItem = document.createElement('li');
                listItem.textContent = `(${comment.timestamp ? new Date(comment.timestamp).toLocaleTimeString() : 'N/A'}) ${comment.user}: ${comment.text}`;
                docCommentsList.appendChild(listItem);
            });
        } else {
            docCommentsList.innerHTML = '<li>Nenhum comentário geral para este documento.</li>';
        }
    }

    const tabButtonsDiv = document.getElementById('tab-buttons');
    if(!tabButtonsDiv) return;
    tabButtonsDiv.innerHTML = '';

    const currentTabNameEl = document.getElementById('current-tab-name');
    if(currentTabNameEl) currentTabNameEl.textContent = '';
    const dataTableContainer = document.getElementById('data-table-container');
    if(dataTableContainer) dataTableContainer.innerHTML = '';

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
        if(currentTabNameEl) currentTabNameEl.textContent = 'Nenhuma aba definida para este documento.';
    }
}

function parseCSV(csvString) {
    if (typeof csvString !== 'string') {
        console.error("parseCSV: input is not a string", csvString);
        return [];
    }
    const lines = csvString.trim().split(/\r?\n/);
    return lines.map(line => line.split(','));
}

function loadTabData(projectName, tabInfo, tabCsvString, projectCellComments) {
    const currentTabNameEl = document.getElementById('current-tab-name');
    if(currentTabNameEl) currentTabNameEl.textContent = `Dados da Aba: ${tabInfo.name}`;

    const dataTableContainer = document.getElementById('data-table-container');
    if(!dataTableContainer) return;
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
                    if (tabInfo && tabInfo.id && rowId && columnHeader) {
                        const hasComment = projectCellComments.some(commentPoint =>
                            commentPoint.tabId === tabInfo.id &&
                            commentPoint.cellCoordinates.rowId === rowId &&
                            commentPoint.cellCoordinates.columnHeader === columnHeader
                        );
                        if (hasComment) {
                            cell.classList.add('has-comment');
                            let commentDetails = "Comentários:\n";
                            projectCellComments.filter(c =>
                                c.tabId === tabInfo.id &&
                                c.cellCoordinates.rowId === rowId &&
                                c.cellCoordinates.columnHeader === columnHeader
                            ).forEach(cPoint => {
                                if (cPoint.threads) {
                                    cPoint.threads.forEach(thread => {
                                        if (thread.entries) {
                                            thread.entries.forEach(entry => {
                                                commentDetails += `- <span class="math-inline">\{entry\.user\} \(</span>{entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : 'N/A'}): <span class="math-inline">\{entry\.commentText\} \[</span>{entry.type}]\n`;
                                            });
                                        }
                                    });
                                }
                            });
                            cell.title = commentDetails;
                        }
                    }
                }
            });
        }
    } else {
        dataTableContainer.innerHTML = "<p>Nenhum dado para exibir nesta aba (após o cabeçalho).</p>";
    }
    dataTableContainer.appendChild(table);
}