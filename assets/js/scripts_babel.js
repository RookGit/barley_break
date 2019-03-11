/**
 * class Game - игровые процессы, новая игра, пауза и т.п
 * class Request - общение с сервером
 * class Timer - управление таймером
 */

var debug = false, timer = null, game = null, server_api = '/api';

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
            'time': 0
        };

        // История ходов
        this.stroke_history = [];

        // Игровые блоки
        this.blocks = [
            [1, 2, 3, 4],
            [5, 6, 7, 8],
            [9, 10, 11, 12],
            [13, 14, 15, 0]
        ];

        // Устанавливаем таймер
        Timer.setTime(this.time);

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

        if (this.start === true)
            if (this.pause === false) {
                dom_buttons += '<br><button data-click="pause" type="button" class="btn btn-warning">Пауза</button>';
            }
            else {
                dom_buttons += '<br><button data-click="continue" type="button" class="btn btn-warning">Продолжить игру</button>';
            }

        $('.buttons_field').empty().append(dom_buttons);

        return this;

    }

    // Перемешать блоки
    randBlocks() {

        var method_sort = function (a, b) {
            return Math.random() - 0.5;
        };

        // Перемешиваем строки по одиночке
        for (let i = 0; i < 4; i++) {
            this.blocks[i].sort(method_sort);
        }

        // Перемешиваем строки
        this.blocks.sort(method_sort);

        return this;
    }

    /**
     * Обработка свайпов
     *
     * @param {string} type - тип свайпа
     * @returns {boolean} - обработан ли свайп
     */
    handlerSwipe(type) {

        if (this.pause === false && this.start === true) {

            // Для записи последнего хода. Какая ячейка сдвинулась (Где была и где стала)
            let last_column, last_row, will_column, will_row;

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

            log('Ячейка была на колонке: ' + last_column, 'Стала на колонке ' + will_column);
            log('Ячейка была на строке: ' + last_row, 'Стала на строке ' + will_row);

            // Добавляем ход в историю, если он валидный и отправляем на сервер
            if (this.stroke > start_stroke) {

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
                    'time': this.time
                };


                // Отправляем данные на сервер последнего хода
                Request.sendData(this.last_action_block);
            }

            return true;
        }
        else
            return false;
    }

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
            alert('Вы выиграли!');

            // Начинаем новую игру
            $('[data-click="new_game"]').trigger('click');
        }
        else
            log('Вы не выиграли!');

        return result;
    }
}

class Timer {
    // Установить время в секундах
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

    static startTimer() {
        Timer.stopTimer();
        timer = setInterval(function () {
            game.time++;
            Timer.setTime(game.time);
        }, 1000);
    }

    static stopTimer() {
        clearInterval(timer);
    }
}

class Request {

    static sendData(object_game) {
        if (typeof object_game === 'object') {
            var params = new Array();

            params.push({
                name: 'data[method]',
                value: 'example_name_method'
            });

            params.push({
                name: 'data[data_game]',
                value: JSON.stringify(object_game)
            });

            // Время отправления запроса
            params.push({
                name: 'data[time_request]',
                value: $.now()
            });

            Request.sendRequest(params);
        }
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

$(document).ready(function () {

    game = new Game();
    game.setButtons();

    $("body").keypress(function (event) {

        let keyCode = event.which;
        let result = false;

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
            log('Кнопка обработана');

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
                Timer.startTimer();
                break;

            case 'pause':
                game.pause = true;
                game.setButtons();
                Timer.stopTimer();
                break;

            case 'continue':
                game.pause = false;
                game.setButtons();
                Timer.startTimer();
                break;

            case 'scroll_down':
                $('html,body').stop().animate(
                    {scrollTop: $('.buttons_field').offset().top}, 1000
                );
                break;

            default:
                result = false;
                break;
        }
    });
});