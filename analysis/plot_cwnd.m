% plot_cwnd.m
% TCP Congestion Control — Report Graph Generator
% Works for both single-run and compare CSVs exported from the dashboard.
%
% USAGE (single run):
%   1. Run a simulation in the dashboard
%   2. Click "↓ export csv" — saves e.g. newreno-cwnd.csv
%   3. Move the CSV into this folder (analysis/)
%   4. Set MODE = 'single' and CSV_FILE below
%   5. Run: plot_cwnd
%
% USAGE (compare):
%   1. Run a compare simulation in the dashboard
%   2. Click "↓ export compare csv" — saves e.g. compare-tahoe-vs-newreno.csv
%   3. Move into analysis/, set MODE = 'compare' and CSV_FILE below
%   4. Run: plot_cwnd

clear; clc; close all;

%% ---- CONFIG — edit these two lines ----
MODE     = 'single';                    % 'single' or 'compare'
CSV_FILE = 'newreno-cwnd.csv';          % filename of your downloaded CSV
%% --------------------------------------

OUTPUT_DIR = 'figures';
if ~exist(OUTPUT_DIR, 'dir'), mkdir(OUTPUT_DIR); end

% ── Dark theme helper ──────────────────────────────────────────────────────
BG     = [0.04 0.05 0.07];
AX_BG  = [0.07 0.08 0.10];
AX_FG  = [0.60 0.60 0.60];
GRID_C = [0.15 0.15 0.20];

function style_axes(ax, bg, ax_fg, grid_c)
  set(ax, 'Color', bg, 'XColor', ax_fg, 'YColor', ax_fg, ...
          'GridColor', grid_c, 'GridAlpha', 1, 'Box', 'off');
end
% ───────────────────────────────────────────────────────────────────────────

if strcmp(MODE, 'single')
    %% ── SINGLE RUN ──────────────────────────────────────────────────────

    % Parse metadata from comment lines
    meta = struct('variant','unknown','bandwidth','?','delay','?', ...
                  'throughputMbps',0,'avgDelayMs',0,'lossRate',0, ...
                  'txPackets',0,'rxPackets',0);
    fid = fopen(CSV_FILE, 'r');
    while ~feof(fid)
        line = strtrim(fgetl(fid));
        if startsWith(line, '#')
            parts = strsplit(line(3:end), ',');
            if numel(parts) >= 2
                key = strtrim(parts{1});
                val = strtrim(parts{2});
                switch key
                    case 'variant',        meta.variant        = val;
                    case 'bandwidth',      meta.bandwidth      = val;
                    case 'delay',          meta.delay          = val;
                    case 'throughputMbps', meta.throughputMbps = str2double(val);
                    case 'avgDelayMs',     meta.avgDelayMs     = str2double(val);
                    case 'lossRate',       meta.lossRate       = str2double(val);
                    case 'txPackets',      meta.txPackets      = str2double(val);
                    case 'rxPackets',      meta.rxPackets      = str2double(val);
                end
            end
        end
    end
    fclose(fid);

    % Load numeric data (skip comment lines)
    raw  = readtable(CSV_FILE, 'CommentStyle', '#');
    t    = raw.time;
    cwnd = raw.cwnd / 1024;   % bytes → KB

    variant_upper = upper(meta.variant);

    % ── Figure 1: cwnd vs time ───────────────────────────────────────────
    fig1 = figure('Color', BG, 'Position', [100 100 960 420]);
    ax1  = axes(fig1);
    plot(ax1, t, cwnd, 'Color', [0.22 0.76 0.98], 'LineWidth', 1.6);
    hold(ax1, 'on');
    xline(ax1, 1.1, '--', 'Color', [0.61 0.29 0.09], 'LineWidth', 1);
    text(ax1, 1.15, max(cwnd)*0.92, 'trace start', ...
         'Color', [0.61 0.29 0.09], 'FontSize', 8, 'FontName', 'Courier New');
    hold(ax1, 'off');
    style_axes(ax1, AX_BG, AX_FG, GRID_C);
    grid(ax1, 'on');
    xlabel(ax1, 'Time (s)',    'Color', AX_FG);
    ylabel(ax1, 'cwnd (KB)',   'Color', AX_FG);
    title(ax1, sprintf('Congestion Window  —  %s  (%s, %s)', ...
          variant_upper, meta.bandwidth, meta.delay), ...
          'Color', 'w', 'FontWeight', 'normal', 'FontSize', 13);
    out1 = fullfile(OUTPUT_DIR, [meta.variant '_cwnd.png']);
    exportgraphics(fig1, out1, 'Resolution', 150, 'BackgroundColor', BG);
    fprintf('Saved: %s\n', out1);

    % ── Figure 2: metrics bar chart ──────────────────────────────────────
    fig2 = figure('Color', BG, 'Position', [100 100 580 360]);
    ax2  = axes(fig2);
    vals   = [meta.throughputMbps, meta.avgDelayMs, meta.lossRate];
    labels = {'Throughput (Mbps)', 'Avg Delay (ms)', 'Loss Rate (%)'};
    colors = [0.976 0.451 0.086; 0.220 0.761 0.984; 0.290 0.855 0.502];
    b = bar(ax2, vals, 'FaceColor', 'flat');
    b.CData = colors;
    set(ax2, 'XTickLabel', labels, 'XColor', AX_FG, 'YColor', AX_FG, 'Color', AX_BG);
    title(ax2, sprintf('Flow Metrics  —  %s', variant_upper), ...
          'Color', 'w', 'FontWeight', 'normal', 'FontSize', 13);
    grid(ax2, 'on');
    style_axes(ax2, AX_BG, AX_FG, GRID_C);
    out2 = fullfile(OUTPUT_DIR, [meta.variant '_metrics.png']);
    exportgraphics(fig2, out2, 'Resolution', 150, 'BackgroundColor', BG);
    fprintf('Saved: %s\n', out2);

elseif strcmp(MODE, 'compare')
    %% ── COMPARE RUN ─────────────────────────────────────────────────────

    % Read header to get variant names
    fid = fopen(CSV_FILE, 'r');
    header = fgetl(fid);   % "time,variant1,variant2,..."
    fclose(fid);
    cols     = strsplit(header, ',');
    variants = cols(2:end);   % skip 'time'

    % Parse metadata comments
    param_bw = '?'; param_dl = '?';
    variant_metrics = struct();
    fid = fopen(CSV_FILE, 'r');
    while ~feof(fid)
        line = strtrim(fgetl(fid));
        if startsWith(line, '# params:')
            % "# params: bandwidth=1Mbps,delay=10ms,..."
            parts = strsplit(line(10:end), ',');
            for k = 1:numel(parts)
                kv = strsplit(strtrim(parts{k}), '=');
                if numel(kv)==2
                    if strcmp(kv{1},'bandwidth'), param_bw = kv{2}; end
                    if strcmp(kv{1},'delay'),     param_dl = kv{2}; end
                end
            end
        elseif startsWith(line, '# ') && contains(line, 'throughput=')
            % "# tahoe: throughput=0.475,delay=135.71,loss=0.93,..."
            rest  = line(3:end);
            colon = strfind(rest, ':');
            vname = strtrim(rest(1:colon(1)-1));
            kvstr = strtrim(rest(colon(1)+1:end));
            kvs   = strsplit(kvstr, ',');
            m = struct('throughput',0,'delay',0,'loss',0,'tx',0,'rx',0);
            for k = 1:numel(kvs)
                kv = strsplit(strtrim(kvs{k}), '=');
                if numel(kv)==2
                    switch kv{1}
                        case 'throughput', m.throughput = str2double(kv{2});
                        case 'delay',      m.delay      = str2double(kv{2});
                        case 'loss',       m.loss       = str2double(kv{2});
                        case 'tx',         m.tx         = str2double(kv{2});
                        case 'rx',         m.rx         = str2double(kv{2});
                    end
                end
            end
            variant_metrics.(vname) = m;
        end
    end
    fclose(fid);

    % Load numeric data
    raw = readtable(CSV_FILE, 'CommentStyle', '#');
    t   = raw.time;

    % Palette (matches dashboard)
    PALETTE = containers.Map( ...
        {'tahoe','reno','newreno','westwood','bic','vegas','hybla'}, ...
        {[0.976 0.451 0.086],[0.984 0.573 0.235],[0.220 0.761 0.984], ...
         [0.290 0.855 0.502],[0.655 0.545 0.980],[0.980 0.749 0.141], ...
         [0.957 0.282 0.702]});

    % ── Figure 1: overlaid cwnd traces ───────────────────────────────────
    fig1 = figure('Color', BG, 'Position', [100 100 960 420]);
    ax1  = axes(fig1);
    hold(ax1, 'on');
    leg_handles = gobjects(numel(variants), 1);
    for i = 1:numel(variants)
        v   = variants{i};
        col_name = v;   % table column name == variant id
        if ismember(col_name, raw.Properties.VariableNames)
            cwnd_kb = raw.(col_name) / 1024;
            c = [0.5 0.5 0.5];
            if isKey(PALETTE, v), c = PALETTE(v); end
            leg_handles(i) = plot(ax1, t, cwnd_kb, 'Color', c, 'LineWidth', 1.6, 'DisplayName', upper(v));
        end
    end
    xline(ax1, 1.1, '--', 'Color', [0.61 0.29 0.09], 'LineWidth', 1);
    hold(ax1, 'off');
    style_axes(ax1, AX_BG, AX_FG, GRID_C);
    grid(ax1, 'on');
    xlabel(ax1, 'Time (s)', 'Color', AX_FG);
    ylabel(ax1, 'cwnd (KB)', 'Color', AX_FG);
    title(ax1, sprintf('cwnd Comparison  —  %s vs %s  (%s, %s)', ...
          upper(variants{1}), upper(variants{end}), param_bw, param_dl), ...
          'Color', 'w', 'FontWeight', 'normal', 'FontSize', 13);
    lg = legend(ax1, leg_handles, 'Location', 'northwest');
    set(lg, 'Color', AX_BG, 'TextColor', AX_FG, 'EdgeColor', GRID_C);
    fname = ['compare_' strjoin(variants,'_vs_')];
    out1 = fullfile(OUTPUT_DIR, [fname '_cwnd.png']);
    exportgraphics(fig1, out1, 'Resolution', 150, 'BackgroundColor', BG);
    fprintf('Saved: %s\n', out1);

    % ── Figure 2: side-by-side metrics bar chart ─────────────────────────
    vnames = fieldnames(variant_metrics);
    if ~isempty(vnames)
        n = numel(vnames);
        tput = zeros(1,n); dlay = zeros(1,n); loss = zeros(1,n);
        for i = 1:n
            m       = variant_metrics.(vnames{i});
            tput(i) = m.throughput;
            dlay(i) = m.delay;
            loss(i) = m.loss;
        end
        labels_x = upper(vnames)';

        fig2 = figure('Color', BG, 'Position', [100 100 860 400]);

        subplot_titles = {'Throughput (Mbps)', 'Avg Delay (ms)', 'Loss Rate (%)'};
        data_sets = {tput, dlay, loss};
        sub_colors = {[0.976 0.451 0.086], [0.220 0.761 0.984], [0.290 0.855 0.502]};

        for s = 1:3
            ax = subplot(1, 3, s);
            b  = bar(ax, data_sets{s}, 'FaceColor', sub_colors{s});
            set(ax, 'XTickLabel', labels_x, 'Color', AX_BG, ...
                    'XColor', AX_FG, 'YColor', AX_FG);
            title(ax, subplot_titles{s}, 'Color', AX_FG, 'FontWeight', 'normal');
            grid(ax, 'on');
            style_axes(ax, AX_BG, AX_FG, GRID_C);
        end
        sgtitle(sprintf('Flow Metrics  —  %s vs %s', upper(variants{1}), upper(variants{end})), ...
                'Color', 'w', 'FontWeight', 'normal', 'FontSize', 13);
        set(fig2, 'Color', BG);

        out2 = fullfile(OUTPUT_DIR, [fname '_metrics.png']);
        exportgraphics(fig2, out2, 'Resolution', 150, 'BackgroundColor', BG);
        fprintf('Saved: %s\n', out2);
    end
end

fprintf('\nDone. Figures in: %s/\n', OUTPUT_DIR);