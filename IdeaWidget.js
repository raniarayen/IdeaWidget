const getURL = new Promise((res, rej) => {
    require(["DS/i3DXCompassServices/i3DXCompassServices"], function (f) {
        f.getServiceUrl({
            serviceName: "3DSpace",
            onComplete: async (data) => {
                const request = await fetch(
                    `${data[0].url}/resources/AppsMngt/api/v1/services`
                );
                const responce = await request.json();
                res(
                    responce.platforms[0].services.reduce((acc, el) => {
                        acc[`${el.name}`] = el.url;
                        return acc;
                    }, {})
                );
            },
        });
    });
});

const getRequest = (uri, token) => {
    return new Promise((res, rej) => {
        require(["DS/WAFData/WAFData"], function (f) {
            getURL.then((platform) => {
                f.authenticatedRequest(`${platform["3DSwym"]}/api` + uri, {
                    method: "GET",
                    type: "json",
                    headers: {
                        "X-DS-SWYM-CSRFTOKEN": token?.result?.ServerToken || "",
                    },
                    onComplete: function (data) {
                        res(data);
                    },
                    onError: function (data) {
                        rej(data);
                    },
                });
            });
        });
    });
};

const postRequest = (uri, token, body) => {
    return new Promise((res, rej) => {
        require(["DS/WAFData/WAFData"], function (f) {
            getURL.then((platform) => {
                f.authenticatedRequest(`${platform["3DSwym"]}/api` + uri, {
                    method: "POST",
                    type: "json",
                    data: body,
                    headers: {
                        "X-DS-SWYM-CSRFTOKEN": token?.result?.ServerToken || "",
                        "Content-Type": "application/json",
                    },
                    onComplete: function (data) {
                        res(data);
                    },
                    onError: function (data) {
                        rej(data);
                    },
                });
            });
        });
    });
};

const formDataRequest = (uri, token, body) => {
    return new Promise((res, rej) => {
        require(["DS/WAFData/WAFData"], function (f) {
            getURL.then((platform) => {
                f.authenticatedRequest(`${platform["3DSwym"]}/api` + uri, {
                    method: "POST",
                    type: "json",
                    data: body,
                    headers: {
                        "X-DS-SWYM-CSRFTOKEN": token?.result?.ServerToken || "",
                    },
                    onComplete: function (data) {
                        res(data);
                    },
                    onError: function (data) {
                        rej(data);
                    },
                });
            });
        });
    });
};

const fetchIdeas = (communityId) => {
    return new Promise(async (res, rej) => {
        const token = await getRequest("/index/tk", "");
        const communities = await getRequest(
            "/community/listmycommunities",
            token
        );
        if (communityId) {
            var stagesOfIdeas = await postRequest(
                "/community/get",
                token,
                JSON.stringify({ params: { id: communityId } })
            );
            var ideasData = await postRequest(
                "/feed/whatsnew",
                token,
                JSON.stringify({
                    params: { page: 1, limit: 100, community_id: communityId },
                })
            );
        } else {
            var stagesOfIdeas = await postRequest(
                "/community/get",
                token,
                JSON.stringify({ params: { id: communities.result[0].id } })
            );
            var ideasData = await postRequest(
                "/feed/whatsnew",
                token,
                JSON.stringify({
                    params: {
                        page: 1,
                        limit: 100,
                        community_id: communities.result[0].id,
                    },
                })
            );
        }
        res({
            res: ideasData.result,
            stagesOfIdeas: stagesOfIdeas.result.ideation_status,
            subject6wuri: ideasData.result[0]?.subject6wuri.split("idea")[0],
        });
    });
};

const fetchStageOfIdeaChange = (ideaId, stageId) => {
    return new Promise(async (res, rej) => {
        const token = await getRequest("/index/tk", "");
        var changeStage = await postRequest(
            "/Ideation/updateideationstatus",
            token,
            JSON.stringify({
                params: {
                    id: ideaId,
                    status_id: stageId,
                    out: false,
                    status_comment: "<p><br></p>",
                },
            })
        );
        changeStage.result.acl_status
            ? res(changeStage)
            : rej(changeStage.result.acl_status);
    });
};

const fetchCommunities = new Promise(async (res, rej) => {
    const token = await getRequest("/index/tk", "");
    const communities = await getRequest(
        "/community/listmycommunities",
        token
    );
    res(communities.result);
});

const fetchCurrentUser = new Promise(async (res, rej) => {
    const token = await getRequest("/index/tk", "");
    const currentUser = await getRequest(
        "/user/getcurrent",
        token
    );
    res(currentUser.result.hash_key);
});

const createNewIdea = (community_id, subject6wuri, title, message) => {
    return new Promise(async (res, rej) => {
        const token = await getRequest("/index/tk", "");
        const author = await getRequest("/user/getcurrent", token);
        const uploadRequest = await postRequest(
            "/Ideation/add",
            token,
            JSON.stringify({
                params: {
                    author,
                    subject6wuri,
                    community_id,
                    title,
                    message,
                    contentType: "idea",
                    published: 1,
                    update: new Date().toLocaleString(),
                    withThumbnailsInfo: true,
                },
            })
        );
        res(uploadRequest.result);
    });
};

const uploadFile = (community_id, subject6wuri, title, userFile, fileName) => {
    return new Promise((res, rej) => {
        getURL.then(async (platform) => {
            const typeHash = { image: "picture" };
            const token = await getRequest("/index/tk", "");
            const formData = new FormData();
            formData.append("title", title);
            formData.append("media_type", typeHash[userFile.type.split("/")[0]]);
            formData.append("fileName", fileName);
            formData.append("userFile", userFile);
            formData.append("subject6wuri", subject6wuri);
            formData.append("update", new Date().toLocaleString());
            formData.append("community_id", community_id);
            formData.append("is_illustration", true);
            formData.append("published", 0);
            const uploadRequest = await formDataRequest(
                "/media/addmedia",
                token,
                formData
            );
            res({
                img: `<img data-source='swym' data-community-id=${uploadRequest.result.community_id} data-media-id=${uploadRequest.result.id_media} data-position='center' data-size='large' data-media-type=${uploadRequest.result.media_type} style='width:'${uploadRequest.result.width}';height:'${uploadRequest.result.height} src="${platform["3DSwym"]}api/media/streammedia/id/${uploadRequest.result.id_media}/type/picture/key/o1/">`,
                link: `<a href='${platform["3DSwym"]}/api/media/streammedia/id/${uploadRequest.result.id_media}/type/original/output/download/'>Скачать файл</a>`,
            });
        });
    });
};

const fetchUserList = () => {
    return new Promise((res, rej) => {
        getURL.then(async platform => {
            const req = await fetch(`${platform['3DSearch']}/search`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    with_indexing_date: true,
                    with_nls: true,
                    label: "3DSearch",
                    locale: "ru",
                    select_predicate: ["ds6w:label", "ds6w:description", "ds6w:identifier"],
                    select_file: ["icon", "thumbnail_2d"],
                    query:
                        'flattenedtaxonomies:"types/Person" AND current:"active" AND -name == "Administration User"',
                    order_by: "desc",
                    order_field: "relevance",
                    nresults: 999,
                }),
            });
            const responce = await req.json();
            const results = responce.results.map((el) => {
                return el.attributes.reduce((acc, field) => {
                    if (field.name === "ds6w:label" || field.name === "ds6w:identifier")
                        acc[field.name] = field.value;
                    return acc;
                }, {})
            }
            );
            res(results);
        });
    })
};

//функция создаёт стандартную кнопку
function createButton(container, icon, id = "", className = "primary") {
    require(["DS/UIKIT/Input/Button"], (Button) =>
        document.querySelector(container).hasChildNodes()
            ? ""
            : new Button({ icon, className, id }).inject(
                document.querySelector(container)
            ));
}

//функция создаёт разметку карточки сообщества
function createTile(title, description, id) {
    getURL.then((platform) => {
        return require(["UWA/Core"], function (UWA) {
            var communitiesContainer = document.querySelector("#myKanban");
            document.querySelector("#tilesHeader") ||
                new UWA.Element("h2", {
                    html: "Choose a community to browse ideas",
                    styles: { position: "absolute", top: "0", color: " #005685", 'text-align': 'center', width: '100%' },
                    id: "tilesHeader",
                }).inject(communitiesContainer);

            var containerResponsiveTile =
                document.querySelector("#tileContainer") ||
                new UWA.Element("div", {
                    styles: {
                        display: "grid",
                        "grid-template-columns": "1fr 1fr 1fr",
                        margin: "50px auto 0",
                        "overflow-y": "auto",
                        height: "95%",
                        width: '1000px',
                    },
                    id: "tileContainer",
                }).inject(communitiesContainer);

            new UWA.Element("div", {
                id: id,
                html: [
                    {
                        tag: "h4",
                        text: title,
                        class: "tilecontainer-text",
                        style: { fontSize: "17px" },
                    },
                    {
                        tag: "div",
                        html: {
                            tag: "img",
                            src: `${platform["3DSwym"]}/api/media/streammedia/model/community/model_id/${id}/type/thumb/key/m_thumb`,
                            styles: { width: "100%" },
                        },
                        styles: {
                            height: "200px",
                            overflow: "hidden",
                            borderRadius: "10px",
                            border: "#eee 1px solid",
                            marginBottom: "20px",
                        },
                    },
                    {
                        tag: "p",
                        text: description,
                        class: "tilecontainer-text",
                    },
                ],
                class: "tilecontainer",
                events: {
                    click: function () {
                        widget.setValue("community", id);
                        createKanban();
                    },
                },
            }).inject(containerResponsiveTile);
        });
    });
}

//функция создаёт разметку карточки идеи
function tableTemplate(inputValues, userList) {
    return (
        "<table>" +
        inputValues
            .map(
                (el) => `<tr>
            <td>${el.placeholder.substr(11)}</td> 
            <td>${el.type == "Autocomplete"
                        ? Array.isArray(el.value)
                            ? el.value
                                .map(
                                    (user) =>
                                        `<a contenteditable="false" class="sum-user-link sm-link" data-login=${userList.find(
                                            (person) => person["ds6w:label"] == user.value
                                        )["ds6w:identifier"]
                                        } data-type="internal" data-content-type="person">@${user.value
                                        }</a>`
                                )
                                .join(" ")
                            : `<a contenteditable="false" class="sum-user-link sm-link" data-login=${userList.find((person) => person["ds6w:label"] == el.value)[
                            "ds6w:identifier"
                            ]
                            } data-type="internal" data-content-type="person">@${el.value
                            }</a>`
                        : el.value
                    }</td></tr>`
            )
            .join("") +
        "</table>"
    );
}

//функция создаёт модальное окно для создания идеи
function createNewIdeaModal(communityId, subject6wuri) {
    fetchUserList().then((userList) => {
        return require([
            "DS/UIKIT/SuperModal",
            "DS/UIKIT/Input/Text",
            "DS/UIKIT/Alert",
            "DS/UIKIT/Input/Date",
            "DS/UIKIT/Input/File",
            "DS/UIKIT/Input/Select",
            "DS/UIKIT/Autocomplete",
            "i18n!IdeaWidget/dist/assets/NLS/DSISTable",
        ], function (
            SuperModal,
            TextInput,
            Alert,
            Date,
            File,
            Select,
            Autocomplete,
            Translation
        ) {
            const transcriber = {
                TextInput,
                Alert,
                Date,
                File,
                Select,
                Autocomplete,
            };
            const alert = new Alert({
                visible: true,
                autoHide: true,
                hideDelay: 1000,
            });
            const superModal = new SuperModal({
                renderTo: document.querySelector("#addIdea"),
                animate: true,
            });
            const body = () =>
                Object.values(
                    JSON.parse(widget.getPreference("ideaTemplates")?.value)
                ).map((el) => {
                    if (el.type == "alert") return { html: alert };
                    if (el.type == "Autocomplete") {
                        const autocompleteInput = new Autocomplete(el);
                        autocompleteInput.addDataset({
                            items: userList.map((el) => {
                                return {
                                    value: el[`ds6w:label`],
                                    picture: el[`ds6w:identifier`],
                                };
                            }),
                            configuration: {
                                templateEngine: function (
                                    itemContainer,
                                    itemDataset,
                                    itemData
                                ) {
                                    itemContainer.addClassName(
                                        "default-template people-search-template"
                                    );
                                    itemContainer.setHTML(
                                        `<img class="people-search-img" src='https://3dexp.21xfd04.ds/3DSwym/api/user/getpicture/login/${itemData.picture}'/> <div class="item-label"> ${itemData.value}</div>`
                                    );
                                },
                            },
                        });
                        return {
                            html: autocompleteInput,
                            type: el.type,
                            required: el.required,
                        };
                    }
                    if (transcriber.hasOwnProperty(el.type))
                        return {
                            html: new transcriber[el.type]({
                                ...el,
                                placeholder: Translation.get(el.placeholder),
                                buttonText: Translation.get(el.buttonText),
                            }),
                            type: el.type,
                            required: el.required,
                        };
                    return { html: `<h5>${el.innerText}</h5>` };
                });

            document.querySelector("#addIdeaButton").addEventListener("click", () => {
                const newBody = body();
                superModal.dialog({
                    title: Translation.get("Add new idea"),
                    body: newBody,
                    buttons: [
                        {
                            className: "primary",
                            value: Translation.get("Save"),
                            action: (modal) => {
                                const inputValues = newBody
                                    .filter((el) => transcriber.hasOwnProperty(el.type))
                                    .map((el) => {
                                        return {
                                            type: el.type,
                                            required: el.required,
                                            value:
                                                el.html?.elements?.input.value ||
                                                el.html?.selectedItems,
                                            placeholder: el.html?.options?.placeholder,
                                        };
                                    });

                                const fileLoader = document.querySelector("#file-loader-input");
                                if (
                                    inputValues
                                        .filter((el) => el.required)
                                        .find(
                                            (el) =>
                                                !el.value ||
                                                (el.type == "Autocomplete" && !el.value.length)
                                        ) ||
                                    fileLoader?.title == Translation.get("No file chosen")
                                ) {
                                    alert.add({
                                        className: "error",
                                        message:
                                            Translation.get(
                                                inputValues
                                                    .filter((el) => el.required)
                                                    .find(
                                                        (el) =>
                                                            !el.value ||
                                                            (el.type == "Autocomplete" && !el.value.length)
                                                    )?.placeholder
                                            ) || Translation.get(fileLoader?.title),
                                    });
                                    document.querySelector(".alert").style.visibility = "visible";
                                } else {
                                    modal.hide();
                                    const currentTemplate = widget
                                        .getPreference("ideaTemplates")
                                        .options.find(
                                            (el) =>
                                                el.value == widget.getPreference("ideaTemplates")?.value
                                        ).label;

                                    fileLoader
                                        ? uploadFile(
                                            communityId,
                                            subject6wuri,
                                            fileLoader.title.split(".")[0],
                                            fileLoader.files[0],
                                            fileLoader.title
                                        ).then((data) => {
                                            createNewIdea(
                                                communityId,
                                                subject6wuri,
                                                inputValues[0].value,
                                                inputValues
                                                    .slice(1)
                                                    .map((el) => el.value)
                                                    .join("<br>") +
                                                data.img +
                                                "<br>" +
                                                data.link
                                            ).then(() => createKanban());
                                        })
                                        : createNewIdea(
                                            communityId,
                                            subject6wuri,
                                            inputValues[0].value,
                                            currentTemplate == "Marketing" ||
                                                currentTemplate == "CPE channel" ||
                                                currentTemplate == "CSE channel"
                                                ? tableTemplate(
                                                    inputValues.slice(1).filter((el) => el.value),
                                                    userList
                                                )
                                                : inputValues
                                                    .slice(1)
                                                    .map((el) => el.value)
                                                    .join("<br>")
                                        ).then(() => createKanban());
                                }
                            },
                        },
                        {
                            value: "Отмена",
                            action: (modal) => {
                                modal.hide();
                            },
                        },
                    ],
                });
            });
        });
    });
}

//функция создаёт разметку карточки канбана
function createCard(data, links, people, URL) {
    let teamblock = '', linksblock = '';
    if (people) teamblock = `<div class="card-tags">Team: ${people}</div>`
    if (links) linksblock = `<div class="card-tags">${links}</div>`
    return function () {
        if (data.thumbnail_id)
            return `<div class="container-card"> <div class="card-block" style="padding: 1.5rem"> <img class="card-sample-avatar item_handle drag_handler" src="${URL}/api/user/getpicture/login/${data.author.login}"/> <h5 class="card-subtitle" style='font-size: 10px'>${data.author.first_name} ${data.author.last_name}</h5> <p class="card-header">${data.title}</p> </div> <div class='image-container'><img src="${URL}/api/media/streammedia/id/${data.thumbnail_id}/type/picture/key/o1"></div> <div class="card-block"> <p class="card-text">${data.enhanced_summary}</p> </div>  ${linksblock} ${teamblock} </div>`;
        return `<div class="container-card"> <div class="card-block" style="padding: 1.5rem"> <img class="card-sample-avatar item_handle drag_handler" src="${URL}/api/user/getpicture/login/${data.author.login}"/> <h5 class="card-subtitle" style='font-size: 10px'>${data.author.first_name} ${data.author.last_name}</h5> <p class="card-header">${data.title}</p> </div> <div class="card-block"> <p class="card-text">${data.enhanced_summary}</p> </div> ${linksblock} ${teamblock} </div>`
    }
        ;
}

//функция меняет стиль заголовков
function transferColorsToHeaders() {
    let headers = document.getElementsByClassName("kanban-board-header");
    [...headers].forEach((el) => {
        const color = el.classList[2];
        el.style.backgroundColor = color;
        if (
            parseInt(color.substring(1, 3), 16) * 0.299 +
            parseInt(color.substring(3, 5), 16) * 0.587 +
            parseInt(color.substring(5), 16) * 0.114 >
            156
        ) {
            el.childNodes[0].style.color = "#000000";
        } else {
            el.childNodes[0].style.color = "#ffffff";
        }
    });
}

//функция меняет количество задач в заголовке
function changeHeaders(target, sourse) {
    const targetHeader = target.parentNode.children[0].children[0];
    const sourseHeader = sourse.parentNode.children[0].children[0];
    targetHeader.innerHTML = targetHeader.innerHTML
        .split("(")
        .map((el, i) => {
            if (i === 1) el = +targetHeader.innerHTML.split("(")[1][0] + 1 + ")";
            return el;
        })
        .join("(");
    sourseHeader.innerHTML = sourseHeader.innerHTML
        .split("(")
        .map((el, i) => {
            if (i === 1) {
                el = sourseHeader.innerHTML.split("(")[1][0] - 1 + ")";
            }
            return el;
        })
        .join("(");
}

//функции для того, чтобы рекурсивно пройти по элементам и подобрать их по необходимому виду тега и классу
function walkTheDOM(node, func) {
    func(node);
    node = node.firstChild;
    while (node) {
        walkTheDOM(node, func);
        node = node.nextSibling;
    }
}
function parseTags(node, className = "", tagName = "A") {
    var arrayOfLinks = [];
    function pushLink(currentNode) {
        if (
            currentNode.tagName === tagName &&
            [...currentNode.classList].includes(className)
        )
            arrayOfLinks.push(currentNode);
    }
    walkTheDOM(node, pushLink);
    return arrayOfLinks;
}

//функция, находящая на странице теги и пробрасывающая их в поисковый фильтр
const searchTags = () => {
    document.querySelectorAll(".s6m-tag-link").forEach((tagLink) => {
        tagLink.addEventListener("click", (e) => {
            createKanban(e.target.innerText, true);
        });
    });

    document.querySelectorAll(".sum-user-link").forEach((userLink) => {
        userLink.addEventListener("click", (e) => {
            createKanban(e.target.innerText.slice(1), true);
        });
    });
};

//функция, передающая данные карточек из DOM в модуль DnD для виджета Content Viewer
function makeDraggable(nodes) {
    return require([
        "DS/DataDragAndDrop/DataDragAndDrop",
        "UWA/Utils/InterCom",
    ], function (DnD, InterCom) {
        const socket = new InterCom.Socket("SwymSCI-" + widget.id);
        socket.subscribeServer("ifweServer", window.parent);
        getURL.then((platform) => {
            [...nodes].forEach((node) => {
                const content = JSON.parse(node.dataset.content);
                const data = {
                    protocol: "3DXContent",
                    version: "1.0",
                    source: "X3DMCTY_AP",
                    data: {
                        items: [
                            {
                                displayName: content.title,
                                displayPreview: `${platform["3DSwym"]}/api/media/streammedia/model/idea/model_id/${content.model_id}/type/thumb/key/m_thumb`,
                                displayType: "idea",
                                envId: "OnPremise",
                                objectId: content.subject6wuri,
                                objectType: "idea",
                                serviceId: "3DSwym",
                                urlContent: {
                                    "3DSwym": `${platform["3DSwym"]}#community:${content.community_id}/ideation:${content.model_id}`,
                                    "3DD": `${platform["3DDashboard"]}//#app:X3DMCTY_AP/content:url=${platform["3DSwym"]}&community=${content.community_id}&contentType=idea&contentId=${content.model_id}`,
                                },
                            },
                        ],
                    },
                };

                const infos = {
                    data,
                    start: function (node, event) {
                        event.dataTransfer.setData("text", JSON.stringify(data));
                        socket.dispatchEvent("SwymContentDragStarted", data);
                    },
                    stop: function () {
                        socket.dispatchEvent("SwymContentDragEnded", undefined);
                    },
                };
                node.draggable = true;
                DnD.draggable(node, infos);
            });
        });
    });
}

function createKanban(searchQuery = "", isTag) {
    const myKanban = document.querySelector("#myKanban");
    const buttonContainer = document.querySelector("#myContainer");
    const communityId = widget.getValue("community");
    if (communityId) {
        fetchIdeas(communityId).then((rawData) => {
            //создаем кнопки для того, чтобы вернуться к списку сообществ и добавить новую идею
            buttonContainer.innerHTML = `<div><div id="return"></div><div id="wrappedView"></div><div id="addIdea"></div><div id="addReload"></div><div id="addIdeaModal"></div></div>`;
            myKanban.innerHTML = "";
            const communityName = widget
                .getPreference("community")
                .options.find((el) => el.value == communityId).label;
            searchQuery
                ? widget.setTitle(
                    `${communityName}: Результаты по запросу "${searchQuery}"`
                )
                : widget.setTitle(communityName);
            createButton("#return", "fonticon fonticon-back");
            createButton("#addIdea", "fonticon fonticon-plus", "addIdeaButton");
            createButton("#addReload", "fonticon fonticon-reload", "addReloadButton");
            createButton("#wrappedView", "fonticon fonticon-view-small-tile", "wrappedViewButton");
            createNewIdeaModal(communityId, rawData.subject6wuri);
            document.querySelector("#return").addEventListener("click", () => {
                widget.setTitle("");
                buttonContainer.innerHTML = "";
                myKanban.innerHTML = "";
                createCommunityList();
            });
            document.querySelector("#addReload").addEventListener("click", () => {
                widget.setTitle("");
                widget.dispatchEvent("onLoad");
                widget.contentViewer?.deleteValue("contentId");
                widget.contentViewer?.deleteValue("multiContentIds");
                widget.contentViewer?.dispatchEvent("onLoad");
            });
            document.querySelector("#wrappedView").addEventListener("click", () => {
                widget.wrappedViewTrigger = !widget.wrappedViewTrigger;
                widget.dispatchEvent("onLoad");
            });


            //забираем заголовки колонок и их цвета
            const stagesOfIdeas = rawData.stagesOfIdeas.map((el) => el.title);
            const stagesOfIdeasId = rawData.stagesOfIdeas.map((el) => el.id);
            const colors = rawData.stagesOfIdeas.map((el) => el.color);

            //создаем будущие колонки
            let formattedData = new Array(stagesOfIdeas.length).fill([]);
            //заполняем их информацией
            getURL.then((platform) => {
                rawData.res.forEach((el, i) => {
                    const priority = el.enhanced_summary.match(/(priority .{3})/gmi);
                    priority ? el.priority = +priority[0].charAt(priority[0].length - 1) : el.priority = 5;
                    if (el.status_title) {
                        const links = parseTags(
                            UWA.createElement("div", { html: el.enhanced_summary }),
                            "s6m-tag-link"
                        )
                            .map((el) => el.outerHTML)
                            .join(" ");
                        const people = parseTags(
                            UWA.createElement("div", { html: el.enhanced_summary }),
                            "sum-user-link"
                        )
                            .map((el) => el.outerHTML)
                            .join(" ");
                        const searchFilter =
                            searchQuery.length > 4
                                ? searchQuery.trim().slice(0, -1).toLowerCase()
                                : searchQuery.trim().toLowerCase();

                        let createCardInstance;

                        if (widget.wrappedViewTrigger) {
                            createCardInstance = createCard(
                                { thumbnail_id: el.thumbnail_id, author: el.author, title: el.title, enhanced_summary: `Priority | ${el.priority}` },
                                '',
                                people,
                                platform["3DSwym"]
                            )
                        } else {
                            createCardInstance = createCard(
                                el,
                                links,
                                people,
                                platform["3DSwym"]
                            )
                        }

                        let ideaTitle = '';

                        if (searchQuery) {
                            if (isTag) {
                                if (links.includes(searchQuery) || people.includes(searchQuery)) {
                                    ideaTitle = createCardInstance()
                                }
                            }
                            if (`${el.summary} ${el.title}`.toLowerCase().split(" ")
                                .find(
                                    (el) =>
                                        el.substr(0, searchFilter.length) == searchFilter
                                )) {
                                ideaTitle = createCardInstance()
                            }
                        } else {
                            ideaTitle = createCardInstance()
                        }

                        formattedData[stagesOfIdeas.indexOf(el.status_title)] = [
                            ...formattedData[stagesOfIdeas.indexOf(el.status_title)],
                            {
                                id: el.subject6wuri.split(":idea:")[1],
                                title: ideaTitle,
                                stageId:
                                    stagesOfIdeasId[stagesOfIdeas.indexOf(el.status_title)],
                                owner: el.author.hash_key,
                                content: JSON.stringify(el),
                                priority: el.priority
                            },
                        ];
                    }
                });

                //создаем новый канбан
                new jKanban({
                    element: "#myKanban",
                    gutter: "8px",
                    widthBoard: "280px",
                    itemHandleOptions: {
                        enabled: true,
                    },
                    dropEl: (el, target, source) => {
                        fetchStageOfIdeaChange(
                            el.dataset.eid,
                            stagesOfIdeasId[target.parentNode.dataset.order - 1]
                        ).then((data) => {
                            console.log("status change", data);
                            widget.contentViewer?.dispatchEvent("onLoad")
                        });
                        changeHeaders(target, source);
                    },
                    boards: formattedData.map((board, i) => {
                        return {
                            id: `board_${i}/${communityId}`,
                            title: `${stagesOfIdeas[i]} (${board.length})`,
                            class: `board_${i},${colors[i]}`,
                            item: board.sort((el, prev) => el.priority - prev.priority),
                        };
                    }),
                });
                //активируем поиск по тегам
                searchTags();

                //запрещаем всем, кроме создателя идеи, менять её статус
                const ideaCards = document.getElementsByClassName("kanban-item");
                fetchCurrentUser.then((user) => {
                    [...ideaCards].forEach((card) => {
                        if (user !== card.dataset.owner) {
                            card.classList.add("not-draggable");
                        }
                    });
                });
                makeDraggable(ideaCards);
                // ограничиваем длину текста 8 строками
                // var ellipsis = Ellipsis();
                // var elements = document.getElementsByClassName("card-block");
                // ellipsis.add(elements);
            });
        });
    }
}

//функция, создающая и добавляющая на страницу карточки сообществ
function createCommunityList() {
    fetchCommunities.then((community) =>
        community.forEach((el) => createTile(el.title, el.description, el.id))
    );
    widget.setValue("community", "Не выбрано");
}

//функция, задающая преференсы виджета при запуске
(() => {
    require(["i18n!IdeaWidget/dist/assets/NLS/DSISTable"], function (
        Translation
    ) {
        fetchCommunities.then((community) => {
            const communityPreferences = {
                name: "community",
                type: "list",
                label: Translation.get("Choose a community"),
                options: [{ value: "", label: "Не выбрано" }].concat(
                    community.map(({ title, id }) => {
                        return { value: id, label: title };
                    })
                ),
            };
            widget.addPreference(communityPreferences);

            const ideaTemplatesOptions = {
                name: "ideaTemplatesOptions",
                type: "hidden",
            };
            widget.addPreference(ideaTemplatesOptions);

            const options = widget
                .getPreference("ideaTemplatesOptions")
                .value.map(({ value, label }) => {
                    return { value: JSON.stringify(value), label };
                });
            const ideaTemplates = {
                name: "ideaTemplates",
                type: "list",
                label: Translation.get("Choose an idea template"),
                options: options,
                defaultValue: options[0].value,
            };
            widget.addPreference(ideaTemplates);
            widget.contentViewer = top.UWA.Widgets.instances.find(
                (el) => el.data.appId == "X3DVIEW_AP"
            );
            widget.wrappedViewTrigger = false;

            getURL.then((platform) => {
                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.type = "text/css";
                link.href = `${platform["3DSwym"]}/webapps/SwymUIComponents/SwymUIComponents.css`;
                document.getElementsByTagName("HEAD")[0].appendChild(link);
            });
        });
    });
})();


createCommunityList();