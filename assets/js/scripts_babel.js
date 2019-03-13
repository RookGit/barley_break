/**
 * Игра "Пятнашки"
 *
 * class Game - игровые процессы, новая игра, пауза и т.п
 * class Request - общение с сервером
 * class Timer - управление таймером
 * class DataStorage - управление данными
 *
 * var {Bool} debug - включить логирование
 * var {Bool} easy_game - режим легкой игры
 * var {Game} game - глобальный объект с данными
 * var {Object} timer - глобальный объект для setInterval
 * var {String} server_api - куда будет отправляться XHR
 */

var debug = false, timer = null, game = null, server_api = '/api', easy_game = false;

function log(...mess) {
    if (debug) console.log(mess);
}

function arrayMoveElement(arr, fromIndex, toIndex) {
    var element = arr[fromIndex];
    arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, element);
    return arr;
}

class Game {
    constructor() {

        // Прошло времени
        this.time = 0;

        // Прошло ходов
        this.stroke = 0;

        // Стоит ли пауза
        this.pause = true;

        // Начата ли игра
        this.start = false;

        // Последний сдвинутый блок
        this.last_action_block = {
            // Откуда
            'from': {
                'column': null,
                'row': null
            },

            // Куда
            'in': {
                'column': null,
                'row': null
            },

            // Запоминаем тип свайпа, чтобы проще было откатиться на ход назад
            'last_type_swipe': null,

            // Время хода
            'time': 0,

            // Значение ячейки
            'value': null
        };

        // История ходов
        this.stroke_history = [];

        // Позиция курсора в истории ходов
        this.cursor_position_history = 0;

        // Игровые блоки
        this.blocks = [
            [1, 2, 3, 4],
            [5, 6, 7, 8],
            [9, 10, 11, 12],
            [13, 14, 15, 0]
        ];
    }

    // Инициализация
    init() {
        // Устанавливаем таймер
        Timer.setTime(this.time);

        if (this.pause === false && this.start === true)
            Timer.startTimer();

        this.setStroke();

        // Устанавливаем блоки
        this.setBlocks();
    }

    // Установить блоки
    setBlocks() {

        let string_blocks = '';

        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {

                let value = this.blocks[i][j];

                if (value !== 0)
                    string_blocks += '<div class="game_block">' + value + '</div>';
                else
                    string_blocks += '<div class="game_null_block">&nbsp;</div>';
            }
        }
        $('.game_field').empty().append(string_blocks);

        return this;
    }

    // Установить количество ходов
    setStroke() {
        $('[data-context="stroke"]').text(this.stroke);

        return this;
    }

    // Установить кнопки
    setButtons() {
        var dom_buttons = '<h2>Игра "Пятнашки":</h2>';
        dom_buttons += '<button data-click="new_game" type="button" class="btn btn-warning">Новая игра</button>';

        if (this.start === true) {

            $('[data-click="history"]').fadeIn(300);

            // Если не стоит пауза
            if (this.pause === false) {

                dom_buttons += '<br><button data-click="pause" type="button" class="btn btn-warning">Пауза</button>';

                dom_buttons += `
                    <br>
                    <div data-context="next_last_buttons" class="btn-group" role="group">
                      <button data-click="last_stroke" type="button" class="btn btn-warning">< Отменить</button>
                      <button data-click="next_stroke" type="button" class="btn btn-warning">Повторить ></button>
                    </div>
                    `;
            }
            else {
                // Если стоит пауза
                dom_buttons += '<br><button data-click="continue" type="button" class="btn btn-warning">Продолжить игру</button>';
            }
        }
        else {
            $('[data-click="history"]').fadeOut(300);
        }


        $('.buttons_field').empty().append(dom_buttons);

        // При каждой генерации кнопок управления - проверяем актуальность кнопок управления ходами
        this.checkNextLastButtons();

        return this;

    }

    // Перемешать блоки
    randBlocks() {

        // Если включен режим легкой игры
        if (easy_game) {
            this.blocks = [
                [1, 2, 3, 4],
                [5, 6, 7, 8],
                [9, 10, 11, 0],
                [13, 14, 15, 12]
            ];
        }
        else {

            let method_sort = function (a, b) {
                return Math.random() - 0.5;
            };

            // Перемешиваем строки по одиночке
            for (let i = 0; i < 4; i++) {
                this.blocks[i].sort(method_sort);
            }

            // Перемешиваем строки
            this.blocks.sort(method_sort);
        }

        return this;
    }

    /**
     * Обработка свайпов
     *
     * @param {string} type - тип свайпа
     * @param {boolean} add_stroke - нужно ли добавлять ход
     * @returns {boolean} - обработан ли свайп
     */
    handlerSwipe(type, add_stroke = true) {

        if (this.pause === false && this.start === true) {

            // Для записи последнего хода. Какая ячейка сдвинулась (Где была и где стала)
            let last_column, last_row, will_column, will_row, value_cell;

            let start_stroke = this.stroke;

            switch (type) {
                // Свайп вправо
                case 'right':

                    for (let i = 0; i < 4; i++) {
                        let arr = this.blocks[i];

                        let position_zero = arr.indexOf(0);

                        if (position_zero != -1) {

                            let new_position = position_zero - 1;
                            if (new_position > -1) {
                                // Строка была
                                last_row = i;

                                // Строка стала
                                will_row = i;

                                // Колонка была
                                last_column = new_position;

                                // Колонка стала
                                will_column = position_zero;

                                this.blocks[i] = arrayMoveElement(arr, new_position, position_zero);

                                // Получаем значение перемещаемой ячейки
                                value_cell = this.blocks[i][position_zero];

                                this.setBlocks();
                            }
                            else
                                this.stroke--;

                            break;
                        }

                    }

                    break;

                // Свайп влево
                case 'left':

                    for (let i = 0; i < 4; i++) {
                        let arr = this.blocks[i];

                        let position_zero = arr.indexOf(0);

                        if (position_zero != -1) {

                            let new_position = position_zero + 1;
                            if (new_position < 4) {
                                // Строка была
                                last_row = i;

                                // Строка стала
                                will_row = i;

                                // Колонка была
                                last_column = new_position;

                                // Колонка стала
                                will_column = position_zero;

                                this.blocks[i] = arrayMoveElement(arr, new_position, position_zero);

                                // Получаем значение перемещаемой ячейки
                                value_cell = this.blocks[i][position_zero];

                                this.setBlocks();
                            }
                            else
                                this.stroke--;

                            break;
                        }

                    }
                    break;

                // Свайп вверх
                case 'up':
                // Свайп вниз
                case 'down':
                    let row = null, column = null;

                    // Узнаем row и column где 0
                    for (let i = 0; i < 4; i++) {
                        let arr = this.blocks[i];
                        let position_zero = arr.indexOf(0);
                        if (position_zero != -1) {


                            // Строка стала
                            will_row = i;

                            // Колонка была
                            last_column = position_zero;

                            // Колонка стала
                            will_column = position_zero;

                            row = i;
                            column = position_zero;
                            break;
                        }

                    }

                    if (type === 'up') {

                        log('Строка: ', row, ' / Колонка: ', column);
                        let down_row = row + 1;
                        if (down_row < 4) {
                            // Строка была
                            last_row = down_row;

                            let down_value = this.blocks[down_row][column];
                            log('Нижняя позиция: ', down_value);

                            this.blocks[down_row][column] = 0;
                            this.blocks[row][column] = down_value;

                            // Получаем значение перемещаемой ячейки
                            value_cell = down_value;

                            this.setBlocks();
                        }
                        else
                            this.stroke--;
                    }
                    else if (type === 'down') {


                        log('Строка: ', row, ' / Колонка: ', column);

                        let up_row = row - 1;
                        if (up_row > -1) {
                            // Строка была
                            last_row = up_row;

                            let up_value = this.blocks[up_row][column];
                            log('Верхняя позиция: ', up_value);

                            // Получаем значение перемещаемой ячейки
                            value_cell = up_value;

                            this.blocks[up_row][column] = 0;
                            this.blocks[row][column] = up_value;
                            this.setBlocks();
                        }
                        else
                            this.stroke--;

                    }
                    break;

                default:
                    return false;
                    break;
            }

            // Увеличиваем количество ходов
            this.stroke++;
            this.setStroke();

            // Добавляем ход в историю, если он валидный и отправляем на сервер
            if (this.stroke > start_stroke && add_stroke) {


                // log('Ячейка была на колонке: ' + last_column, 'Стала на колонке ' + will_column);
                // log('Ячейка была на строке: ' + last_row, 'Стала на строке ' + will_row);


                // Отсекаем возможность повтора
                game.stroke_history.length = game.cursor_position_history;

                game.cursor_position_history++;

                this.stroke_history[this.stroke_history.length] = type;

                this.last_action_block = {
                    // Откуда
                    'from': {
                        'column': last_column + 1,
                        'row': last_row + 1
                    },

                    // Куда
                    'in': {
                        'column': will_column + 1,
                        'row': will_row + 1
                    },

                    // Запоминаем тип свайпа, чтобы проще было откатиться на ход назад
                    'last_type_swipe': type,

                    // Время хода
                    'time': this.time,

                    'value': value_cell
                };


                // Добавляем данные в историю
                this.addItemHistory('last_stroke');

                // Отправляем данные на сервер последнего хода
                // с запуском на сервере абстрактного метода save_data_of_last_stroke
                Request.sendDataWithWrapper(this.last_action_block, 'save_data_of_last_stroke');
            }

            // Проверяем отображать ли кнопки отменить / повторить
            this.checkNextLastButtons();

            // Сохраняем данные после каждого хода
            DataStorage.saveGameData(game);

            return true;
        }
        else
            return false;
    }

    // Добавить последний ход в историю
    addItemHistory(type) {

        // Добавляемый элемент
        let element = null;

        switch (type) {
            case 'new_game':

                var now = new Date();
                element = `
                    <div data-cotext="alert_new_game" class="element_history">
                    <b>Игра началась!</b><br>В ${now.toLocaleTimeString()}
                    </div>
                `;

                $('.history_stroke').empty();

                break;

            case 'next_stroke':
                element = `
                    <div data-cotext="next_stroke" class="element_history bg-dark text-light">
                    <b>Повтор хода!</b>
                    </div>
                `;
                break;

            case 'win':
                element = `
                    <div data-cotext="next_stroke" class="element_history bg-success">
                    <b>Вы выиграли!</b>
                    </div>
                `;
                break;

            case 'last_stroke_rollback':
                element = `
                    <div data-cotext="last_stroke_rollback" class="element_history bg-info">
                    <b>Отмена хода!</b>
                    </div>
                `;
                break;

            case 'pause':

                var now = new Date();
                element = `
                    <div data-cotext="alert_pause" class="element_history bg-danger text-light">
                    <b>Пауза!</b><br>В ${now.toLocaleTimeString()}
                    </div>
                `;

                break;

            case 'continue':

                var now = new Date();
                element = `
                    <div data-cotext="alert_continue" class="element_history bg-primary text-light">
                    <b>Игра продолжается :)</b><br>В ${now.toLocaleTimeString()}
                    </div>
                `;

                break;

            case 'last_stroke':
                let last_swipe = this.last_action_block.last_type_swipe;
                let last_time = this.last_action_block.time;
                let last_element_value = this.last_action_block.value;

                element = `
        
                    <div data-cotext="last_stroke" class="element_history">
                    <b>Блок: ${last_element_value}</b> | ${Timer.getTimerByNumber(last_time)}
                    </div>
                
                `;
                break;
        }

        if (element != null) {
            $('.history_stroke').append(element).scrollTop(
                document.querySelector('.history_stroke').scrollHeight
            );

        }

    }

    // Проверить выиграл ли пользователь
    checkWin() {

        // Число для сравнения
        var number = 0;

        // Помечаем, что человек выиграл
        var result = true;

        for (let i = 0; i < 4; i++) {
            if (result)
                for (let j = 0; j < 4; j++) {
                    number++;

                    let value = this.blocks[i][j];

                    if (value !== number && value != 0) {
                        result = false;
                        break;
                    }
                }
        }

        if (result === true) {

            // Останавливаем таймер
            Timer.stopTimer();

            this.addItemHistory('win');

            $('input[name="count_stroke"]').val(game.stroke);
            $('input[name="time"]').val(game.time);

            $('#modal_save_result').modal('show');
        }

        return result;
    }

    // Откат хода
    rollbackStroke(last_type_swipe, need_inversion = true) {

        // Противоположные свайпы
        let swipe_inversion = {
            'left': 'right',
            'right': 'left',
            'up': 'down',
            'down': 'up'
        };

        if (last_type_swipe in swipe_inversion) {
            let rollback_swipe = swipe_inversion[last_type_swipe];


            // Совершаем противоположное действие и не добавляем ход в историю
            return need_inversion ? this.handlerSwipe(rollback_swipe, false) : this.handlerSwipe(last_type_swipe, false);


        }

    }

    // Получить предыдущий свайп
    getLastStrokeSwipe() {
        return this.stroke_history[this.cursor_position_history - 1];
    }

    // Получить последующий свайп
    getNextStrokeSwipe() {
        return this.stroke_history[this.cursor_position_history];
    }

    // Проверка активности кнопок назад, вперед
    checkNextLastButtons() {

        let need_visible_buttons = false;

        if (this.pause === false && this.start === true) {
            need_visible_buttons = true;
        }

        if (need_visible_buttons) {
            $('[data-context="next_last_buttons"]').show();

            let btn_next = $('[data-click="next_stroke"]');
            let btn_last = $('[data-click="last_stroke"]');

            // Проверяем есть ли что-то в истории
            if (this.stroke_history.length > 0) {

                btn_next.prop('disabled', false);
                btn_last.prop('disabled', false);

                if (typeof this.getLastStrokeSwipe() === 'undefined')
                    btn_last.prop('disabled', true);

                if (typeof this.getNextStrokeSwipe() === 'undefined')
                    btn_next.prop('disabled', true);
            }
            else {
                btn_next.prop('disabled', true);
                btn_last.prop('disabled', true);
            }
        }
        else {
            $('[data-context="next_last_buttons"]').hide();
        }

        return this;
    }

}

class Timer {
    /**
     * Установить время в секундах
     * @param {number} time - время в секундах
     */
    static setTime(time) {
        if (typeof time === 'number')
            $('[data-context="timer"]').text(Timer.getTimerByNumber(time));
        else
            throw new TypeError('Ошибка, для таймера должно передаваться число!');
    }

    /**
     * Получить строку вида H:mm:ss
     *
     * @param {integer} number - количество секунд
     * @returns {string} - строка прошедшем временем в формате H:mm:ss
     */
    static getTimerByNumber(number) {
        var date = new Date(null);
        date.setSeconds(number);
        return date.toISOString().substr(11, 8);
    }

    // Запустить таймер
    static startTimer() {
        Timer.stopTimer();
        timer = setInterval(function () {
            game.time++;
            Timer.setTime(game.time);

            // Сохраняем данные
            DataStorage.saveGameData(game);
        }, 1000);
    }

    // Остановить таймер
    static stopTimer() {
        clearInterval(timer);
    }
}

class Request {

    // Отправить данные с оберткой
    static sendDataWithWrapper(data, name_method, not_to_json = false) {

        var params = new Array();

        params.push({
            name: 'data[method]',
            value: name_method
        });

        if (not_to_json === false)
            params.push({
                name: 'data[data_game]',
                value: JSON.stringify(data)
            });
        else
            params.push({
                name: 'data[data_game]',
                value: data
            });

        // Время отправления запроса
        params.push({
            name: 'data[time_request]',
            value: $.now()
        });

        Request.sendRequest(params);
    }

    static sendRequest(params) {
        $.ajax({
            type: 'POST',
            url: server_api,
            // dataType: 'json',
            // async: false,
            data: params,
            success: function (data) {
                // ...
            },
            error: function (data) {
                // ...
            }
        });
    }

}

class DataStorage {

    // Сохраняем данные игры
    static saveGameData(object) {

        // Прикрепляем историю в объект
        object.dom_history = $('.history_stroke').html();

        localStorage.setItem('data_game', JSON.stringify(object));
    }

    // Загружаем данные игры
    static loadGameData() {
        let data = localStorage.getItem('data_game');

        if (data !== null) {
            data = JSON.parse(data);
            for (let key in game) {
                if (typeof data[key] != 'undefined') {
                    game[key] = data[key];
                }
            }

            $('.history_stroke').html(data.dom_history);
        }

        // Инциализация
        game.init();
    }
}

$(document).ready(function () {

    game = new Game();

    // Загружаем данные в объект
    DataStorage.loadGameData();

    game.setButtons();

    $("body").keypress(function (event) {

        let keyCode = event.which;
        let result = false;

        // Регистрируем нажатие клавиш только если закрыто модальное окно
        if (!$('#modal_save_result').hasClass('show'))
            switch (keyCode) {
                case 119:
                case 1094:
                    log('Кнопка вверх');
                    result = game.handlerSwipe('up');
                    break;

                case 115:
                case 1099:
                    log('Кнопка вниз');
                    result = game.handlerSwipe('down');
                    break;

                case 1092:
                case 97:
                    log('Кнопка влево');
                    result = game.handlerSwipe('left');
                    break;

                case 100:
                case 1074:
                    log('Кнопка вправо');
                    result = game.handlerSwipe('right');
                    break;
            }

        if (result === true) {
            // Проверяем выиграл ли пользователь (После каждого хода)
            game.checkWin();
        }

    });

    $(document).on('click', '[data-click]', function (event) {
        let context_click = $(this).data('click');
        var result = true;

        switch (context_click) {
            case 'new_game':
                game = new Game();
                game.start = true;
                game.pause = false;
                game.randBlocks().setBlocks().setStroke().setButtons();
                game.addItemHistory('new_game');
                Timer.startTimer();
                break;

            case 'pause':
                game.pause = true;
                game.setButtons();
                game.addItemHistory('pause');
                Timer.stopTimer();
                break;

            case 'continue':
                game.pause = false;
                game.setButtons();
                Timer.startTimer();
                game.addItemHistory('continue');
                break;

            case 'scroll_down':
                $('html,body').stop().animate(
                    {scrollTop: $('.buttons_field').offset().top}, 1000
                );
                break;

            case 'history':
                // Показываем панель истории и скроллим вниз
                $('.history_stroke').fadeToggle(300).scrollTop(
                    document.querySelector('.history_stroke').scrollHeight
                );

                // Показываем блокирующий фон
                $('.block').fadeToggle(400);


                break;

            // Отменить,
            case 'last_stroke':

                let last_stroke = game.getLastStrokeSwipe();
                game.addItemHistory('last_stroke_rollback');
                game.cursor_position_history--;

                game.rollbackStroke(last_stroke);
                game.checkNextLastButtons();
                break;

            // Повторить
            case 'next_stroke':
                // Откат без инверсии
                game.rollbackStroke(game.getNextStrokeSwipe(), false);
                game.addItemHistory('next_stroke');
                game.cursor_position_history++;
                game.checkNextLastButtons();
                break;

            // Отправить данные формы
            case 'send_form_result':

                if ($('[name="name"]').val().length > 0 && $('[name="surname"]').val().length > 0) {

                    let params = $('[data-form="request_result_game"]').serializeArray();

                    // Отправляем данные на сервер
                    Request.sendDataWithWrapper(params, 'save_result', false);

                    // Скрываем модалку
                    $('#modal_save_result').modal('hide');
                }
                else {
                    $('.error_form').html('Ошибка:<br>Заполните все данные!');
                }
                break;

            default:
                result = false;
                break;
        }

        // Сохраняем данные
        DataStorage.saveGameData(game);
    });

    // Listener закрытия формы
    $("#modal_save_result").on("hide.bs.modal", function () {

        // Очищаем форму с ошибками
        $('.error_form').empty();

        // Очищаем форму
        $('[data-form="request_result_game"] input').val('');

        // Начинаем новую игру
        $('[data-click="new_game"]').trigger('click');

    });

    // Свайпы
    $('[data-context="gesture_listener"]').swipe({
        swipeLeft: function () {
            game.handlerSwipe('left');
        },
        swipeRight: function () {
            game.handlerSwipe('right');
        },
        swipeUp: function () {
            game.handlerSwipe('up');
        },
        swipeDown: function () {
            game.handlerSwipe('down');
        },
    });
});

